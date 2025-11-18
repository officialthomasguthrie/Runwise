/**
 * Workflow Executor
 * Executes workflows with both library and custom nodes
 */

import type { Node, Edge } from '@xyflow/react';
import { nodeRegistry } from '@/lib/nodes/registry';
// Lazy load sandbox to avoid vm2 bundling issues in Next.js
import type {
  ExecutionContext,
  NodeExecutionResult,
  WorkflowExecutionResult,
  LogEntry,
} from './types';

/**
 * Executes a complete workflow
 */
export async function executeWorkflow(
  workflowId: string,
  nodes: Node[],
  edges: Edge[],
  triggerData: any = {},
  userId: string,
  skipTriggers: boolean = false
): Promise<WorkflowExecutionResult> {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startedAt = new Date().toISOString();
  const nodeResults: NodeExecutionResult[] = [];
  const logs: LogEntry[] = [];
  
  // Create execution context
  const context = createExecutionContext(userId, logs);

  try {
    // Validate workflow has nodes
    if (!nodes || nodes.length === 0) {
      throw new Error('Workflow has no nodes');
    }

    let nodesToExecute = nodes;
    let edgesToUse = edges;
    let initialOutput = triggerData;

    // If skipTriggers is true, execute trigger nodes first to get their output, then execute action nodes
    if (skipTriggers) {
      const triggerNodes: Node[] = [];
      const actionNodes: Node[] = [];
      
      nodes.forEach((node) => {
        const nodeData = (node.data ?? {}) as Record<string, any>;
        const nodeId = typeof nodeData.nodeId === 'string' ? nodeData.nodeId : node.id;
        
        // Check if it's a trigger node by type or by checking registry
        const isTrigger = 
          node.type === 'trigger' || 
          node.type === 'scheduled-time-trigger' ||
          (typeof node.type === 'string' && node.type.includes('trigger')) ||
          (nodeData.nodeId && nodeRegistry[nodeId]?.type === 'trigger');
        
        if (isTrigger) {
          triggerNodes.push(node);
        } else {
          actionNodes.push(node);
        }
      });

      // Execute trigger nodes first to get their output (for test execution)
      if (triggerNodes.length > 0) {
        logs.push({
          level: 'info',
          message: `Test execution: Executing ${triggerNodes.length} trigger node(s) to generate test data`,
          timestamp: new Date().toISOString(),
        });

        // Execute each trigger node to get its output
        const triggerOutputs: any[] = [];
        for (const triggerNode of triggerNodes) {
          const nodeData = (triggerNode.data ?? {}) as Record<string, any>;
          const nodeLabel = typeof nodeData.label === 'string' ? nodeData.label : triggerNode.id;
          
          try {
            logs.push({
              level: 'info',
              message: `Executing trigger node: ${nodeLabel} (test execution)`,
              timestamp: new Date().toISOString(),
            });

            const triggerOutput = await executeNode(triggerNode, {}, context);
            triggerOutputs.push(triggerOutput);
            
            logs.push({
              level: 'info',
              message: `Trigger node executed successfully: ${nodeLabel}`,
              data: { outputKeys: Object.keys(triggerOutput || {}) },
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            logs.push({
              level: 'warn',
              message: `Trigger node execution failed, using empty data: ${nodeLabel}`,
              data: { error: error.message },
              timestamp: new Date().toISOString(),
            });
            // Use empty object if trigger fails
            triggerOutputs.push({});
          }
        }

        // Merge all trigger outputs into initial output
        initialOutput = triggerOutputs.reduce((acc, output) => ({ ...acc, ...output }), triggerData);
        
        logs.push({
          level: 'info',
          message: `Trigger nodes executed, starting action nodes with merged output`,
          data: { outputKeys: Object.keys(initialOutput || {}) },
          timestamp: new Date().toISOString(),
        });
      }

      // Filter edges to only include edges between action nodes (remove trigger->action edges, keep action->action)
      const triggerNodeIds = new Set(triggerNodes.map(n => n.id));
      edgesToUse = edges.filter(
        (edge) => !triggerNodeIds.has(edge.source) && !triggerNodeIds.has(edge.target)
      );
      nodesToExecute = actionNodes;

      // If no action nodes remain, throw error
      if (nodesToExecute.length === 0) {
        throw new Error('Workflow has no action nodes to execute (only trigger nodes found)');
      }

      logs.push({
        level: 'info',
        message: `Test execution: Executed ${triggerNodes.length} trigger node(s), executing ${nodesToExecute.length} action node(s)`,
        timestamp: new Date().toISOString(),
      });
    }

    // Sort nodes by execution order (topological sort based on edges)
    const sortedNodes = topologicalSort(nodesToExecute, edgesToUse);

    // Execute each node in order, starting with the initial output (from triggers or triggerData)
    let previousOutput = initialOutput;

    for (const node of sortedNodes) {
      const nodeStartTime = Date.now();
      const nodeLogs: LogEntry[] = [];
      const nodeData = (node.data ?? {}) as Record<string, any>;
      const nodeLabel = typeof nodeData.label === 'string' ? nodeData.label : node.id;

      try {
        logs.push({
          level: 'info',
          message: `Executing node: ${nodeLabel}`,
          timestamp: new Date().toISOString(),
        });

        // Execute the node
        const nodeOutput = await executeNode(node, previousOutput, context);

        const duration = Date.now() - nodeStartTime;

        // Record successful execution
        nodeResults.push({
          nodeId: node.id,
          nodeName: nodeLabel,
          status: 'success',
          outputData: nodeOutput,
          duration,
          logs: nodeLogs,
        });

        // Pass output to next node
        previousOutput = nodeOutput;

        logs.push({
          level: 'info',
          message: `Node completed successfully: ${nodeLabel}`,
          data: { duration, outputKeys: Object.keys(nodeOutput || {}) },
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        const duration = Date.now() - nodeStartTime;
        const errorMessage = error.message || error.toString() || 'Unknown error';
        const errorStack = error.stack || '';

        // Record failed execution
        nodeResults.push({
          nodeId: node.id,
          nodeName: nodeLabel,
          status: 'failed',
          outputData: null,
          error: errorMessage,
          duration,
          logs: nodeLogs,
        });

        logs.push({
          level: 'error',
          message: `Node failed: ${nodeLabel}`,
          data: { 
            error: errorMessage,
            stack: errorStack,
            nodeId: node.id,
            nodeType: node.type,
            nodeData: nodeData,
          },
          timestamp: new Date().toISOString(),
        });

        console.error(`❌ Node execution failed:`, {
          nodeId: node.id,
          nodeName: nodeLabel,
          nodeType: node.type,
          error: errorMessage,
          stack: errorStack,
          nodeData: nodeData,
        });

        // Throw to stop execution with detailed error
        throw new Error(`Node "${nodeLabel}" (${node.type || 'unknown type'}) failed: ${errorMessage}`);
      }
    }

    const completedAt = new Date().toISOString();
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    
    return {
      executionId,
      workflowId,
      status: 'success',
      startedAt,
      completedAt,
      duration,
      nodeResults,
      finalOutput: previousOutput,
    };
  } catch (error: any) {
    const completedAt = new Date().toISOString();
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    logs.push({
      level: 'error',
      message: `Workflow execution failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
    
    return {
      executionId,
      workflowId,
      status: 'failed',
      startedAt,
      completedAt,
      duration,
      nodeResults,
      finalOutput: null,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Executes a single node (library or custom)
 */
async function executeNode(
  node: Node,
  inputData: any,
  context: ExecutionContext
): Promise<any> {
  const nodeData = (node.data ?? {}) as Record<string, any>;

  // Check if it's a custom node
  if (nodeData.nodeId === 'CUSTOM_GENERATED' || nodeData.customCode) {
    return executeCustomNode(node, inputData, context);
  }

  // Execute library node
  return executeLibraryNode(node, inputData, context);
}

/**
 * Executes a custom AI-generated node
 */
async function executeCustomNode(
  node: Node,
  inputData: any,
  context: ExecutionContext
): Promise<any> {
  const nodeData = (node.data ?? {}) as Record<string, any>;
  const customCode = nodeData.customCode;
  const config = nodeData.config || {};

  if (typeof customCode !== 'string' || customCode.trim().length === 0) {
    throw new Error('Custom node has no code');
  }

  // Lazy load sandbox to avoid vm2 bundling issues in Next.js
  const { executeCustomCode, validateCustomCode } = await import('./sandbox');

  // Validate code
  const validation = validateCustomCode(customCode);
  if (!validation.valid) {
    throw new Error(`Invalid custom code: ${validation.errors.join(', ')}`);
  }

  // Execute in sandbox
  const result = await executeCustomCode(customCode, inputData, config, context);

  if (!result.success) {
    throw new Error(result.error || 'Custom code execution failed');
  }

  return result.result;
}

/**
 * Executes a library node from the node registry
 */
async function executeLibraryNode(
  node: Node,
  inputData: any,
  context: ExecutionContext
): Promise<any> {
  const nodeData = (node.data ?? {}) as Record<string, any>;
  const nodeId = typeof nodeData.nodeId === 'string' ? nodeData.nodeId : node.id;
  const config = nodeData.config || {};

  console.log('🔧 Executing library node:', {
    nodeId,
    nodeType: node.type,
    hasConfig: !!config && Object.keys(config).length > 0,
    configKeys: Object.keys(config || {}),
    inputDataKeys: Object.keys(inputData || {}),
  });

  // Get node definition from registry
  const nodeDef = nodeRegistry[nodeId];
  if (!nodeDef) {
    console.error('❌ Node not found in registry:', {
      nodeId,
      availableNodes: Object.keys(nodeRegistry).slice(0, 10), // Log first 10 for debugging
      nodeData,
    });
    throw new Error(`Node not found in library: ${nodeId}. Available nodes: ${Object.keys(nodeRegistry).join(', ')}`);
  }

  // Execute the node's function
  try {
    console.log('▶️ Calling node execute function:', nodeId);
    const output = await nodeDef.execute(inputData, config, context);
    console.log('✅ Node execute completed:', {
      nodeId,
      outputKeys: Object.keys(output || {}),
    });
    return output;
  } catch (error: any) {
    console.error('❌ Library node execution error:', {
      nodeId,
      error: error.message,
      stack: error.stack,
      config,
      inputDataKeys: Object.keys(inputData || {}),
    });
    throw new Error(`Library node execution failed: ${error.message}`);
  }
}

/**
 * Creates execution context for nodes
 */
function createExecutionContext(userId: string, logs: LogEntry[]): ExecutionContext {
  return {
    auth: {
      // In production, fetch user's API keys from database
      // For now, use placeholder
    },
    http: {
      get: async (url: string, options?: any) => {
        logs.push({
          level: 'info',
          message: `HTTP GET: ${url}`,
          timestamp: new Date().toISOString(),
        });
        const response = await fetch(url, {
          method: 'GET',
          ...options,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || response.statusText };
          }
          
          logs.push({
            level: 'error',
            message: `HTTP GET failed: ${url} (${response.status})`,
            data: errorData,
            timestamp: new Date().toISOString(),
          });

          throw new Error(`HTTP ${response.status}: ${errorData.message || errorData.error || response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return await response.text();
      },
      post: async (url: string, data: any, options?: any) => {
        logs.push({
          level: 'info',
          message: `HTTP POST: ${url}`,
          timestamp: new Date().toISOString(),
        });

        // Handle FormData and URL-encoded data separately
        let body: any;
        const { headers: optionHeaders, ...fetchOptions } = options ?? {};
        const headers = new Headers(optionHeaders as HeadersInit);

        if (data instanceof FormData) {
          body = data;
          // Don't set Content-Type for FormData - browser will set it with boundary
          headers.delete('Content-Type');
        } else if (typeof data === 'string' && headers.get('Content-Type') === 'application/x-www-form-urlencoded') {
          // URL-encoded form data (e.g., Twilio)
          body = data;
          // Keep the Content-Type header as is
        } else {
          body = JSON.stringify(data);
          if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
          }
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          ...fetchOptions,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || response.statusText };
          }

          logs.push({
            level: 'error',
            message: `HTTP POST failed: ${url} (${response.status})`,
            data: errorData,
            timestamp: new Date().toISOString(),
          });

          throw new Error(`HTTP ${response.status}: ${errorData.message || errorData.error || response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return await response.text();
      },
      put: async (url: string, data: any, options?: any) => {
        logs.push({
          level: 'info',
          message: `HTTP PUT: ${url}`,
          timestamp: new Date().toISOString(),
        });

        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: JSON.stringify(data),
          ...options,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || response.statusText };
          }

          logs.push({
            level: 'error',
            message: `HTTP PUT failed: ${url} (${response.status})`,
            data: errorData,
            timestamp: new Date().toISOString(),
          });

          throw new Error(`HTTP ${response.status}: ${errorData.message || errorData.error || response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return await response.text();
      },
      patch: async (url: string, data: any, options?: any) => {
        logs.push({
          level: 'info',
          message: `HTTP PATCH: ${url}`,
          timestamp: new Date().toISOString(),
        });

        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: JSON.stringify(data),
          ...options,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || response.statusText };
          }

          logs.push({
            level: 'error',
            message: `HTTP PATCH failed: ${url} (${response.status})`,
            data: errorData,
            timestamp: new Date().toISOString(),
          });

          throw new Error(`HTTP ${response.status}: ${errorData.message || errorData.error || response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return await response.text();
      },
      delete: async (url: string, options?: any) => {
        logs.push({
          level: 'info',
          message: `HTTP DELETE: ${url}`,
          timestamp: new Date().toISOString(),
        });

        const response = await fetch(url, {
          method: 'DELETE',
          ...options,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || response.statusText };
          }

          logs.push({
            level: 'error',
            message: `HTTP DELETE failed: ${url} (${response.status})`,
            data: errorData,
            timestamp: new Date().toISOString(),
          });

          throw new Error(`HTTP ${response.status}: ${errorData.message || errorData.error || response.statusText}`);
        }

        // DELETE might not return content
        if (response.headers.get('content-length') === '0' || !response.body) {
          return { success: true };
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return await response.text();
      },
    },
    logger: {
      info: (message: string, data?: any) => {
        logs.push({
          level: 'info',
          message,
          data,
          timestamp: new Date().toISOString(),
        });
      },
      error: (message: string, error?: any) => {
        logs.push({
          level: 'error',
          message,
          data: error,
          timestamp: new Date().toISOString(),
        });
      },
      warn: (message: string, data?: any) => {
        logs.push({
          level: 'warn',
          message,
          data,
          timestamp: new Date().toISOString(),
        });
      },
      debug: (message: string, data?: any) => {
        logs.push({
          level: 'debug',
          message,
          data,
          timestamp: new Date().toISOString(),
        });
      },
    },
  };
}

/**
 * Sorts nodes in execution order using topological sort
 */
function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  // Build adjacency list
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  nodes.forEach((node) => {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build graph
  edges.forEach((edge) => {
    adjacencyList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Find start nodes (in-degree = 0)
  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  // Topological sort
  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    adjacencyList.get(current)?.forEach((neighbor) => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    });
  }

  // Check for cycles
  if (sorted.length !== nodes.length) {
    throw new Error('Workflow contains cycles');
  }

  // Return nodes in sorted order
  return sorted.map((id) => nodes.find((n) => n.id === id)!);
}
