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
  ExecutionSummary,
} from './types';
import { resolveConfigTemplates } from './template-resolver';
import { normalizeError } from './error-normalization';

/**
 * Executes a complete workflow
 */
export async function executeWorkflow(
  workflowId: string,
  nodes: Node[],
  edges: Edge[],
  triggerData: any = {},
  userId: string
): Promise<WorkflowExecutionResult> {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startedAt = new Date().toISOString();
  const nodeResults: NodeExecutionResult[] = [];
  const logs: LogEntry[] = [];
  
  // Create execution context (async to load integration tokens)
  const context = await createExecutionContext(userId, logs);

  try {
    // Validate workflow has nodes
    if (!nodes || nodes.length === 0) {
      throw new Error('Workflow has no nodes');
    }

    // Sort nodes by execution order (topological sort based on edges)
    const sortedNodes = topologicalSort(nodes, edges);

    // Build reverse edge map: target -> [sources]
    const sourceMap = new Map<string, string[]>();
    edges.forEach((edge) => {
      const sources = sourceMap.get(edge.target) || [];
      sources.push(edge.source);
      sourceMap.set(edge.target, sources);
    });

    // Track outputs for each node
    const nodeOutputs = new Map<string, any>();

    // Execute each node in order
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

        // Get input data for this node
        const sourceNodeIds = sourceMap.get(node.id) || [];
        let inputData: any;

        if (sourceNodeIds.length === 0) {
          // No sources = trigger node, use triggerData
          inputData = triggerData;
          logs.push({
            level: 'info',
            message: `Node ${nodeLabel} is a trigger node, using triggerData`,
            timestamp: new Date().toISOString(),
          });
        } else if (sourceNodeIds.length === 1) {
          // Single source = use that node's output
          const sourceOutput = nodeOutputs.get(sourceNodeIds[0]);
          if (sourceOutput === undefined) {
            throw new Error(`Source node ${sourceNodeIds[0]} has no output`);
          }
          inputData = sourceOutput;
          logs.push({
            level: 'info',
            message: `Node ${nodeLabel} receiving input from single source: ${sourceNodeIds[0]}`,
            timestamp: new Date().toISOString(),
          });
        } else {
          // Multiple sources = merge their outputs
          const sourceOutputs = sourceNodeIds.map((sourceId) => {
            const output = nodeOutputs.get(sourceId);
            if (output === undefined) {
              throw new Error(`Source node ${sourceId} has no output`);
            }
            return output;
          });

          // Merge strategy: combine all outputs into a single object
          // If outputs are objects, merge them. If arrays, combine them.
          inputData = {};
          sourceOutputs.forEach((output, index) => {
            if (typeof output === 'object' && output !== null && !Array.isArray(output)) {
              // Merge object properties
              Object.assign(inputData, output);
              // Also store under source node ID for reference
              inputData[`_from_${sourceNodeIds[index]}`] = output;
            } else if (Array.isArray(output)) {
              // Combine arrays
              if (!Array.isArray(inputData)) {
                inputData = [];
              }
              inputData.push(...output);
            } else {
              // Store primitive values under source node ID
              inputData[`_from_${sourceNodeIds[index]}`] = output;
            }
          });

          logs.push({
            level: 'info',
            message: `Node ${nodeLabel} receiving input from ${sourceNodeIds.length} sources: ${sourceNodeIds.join(', ')}`,
            data: { mergedKeys: Object.keys(inputData) },
            timestamp: new Date().toISOString(),
          });
        }

        // Resolve templates in config before execution
        const nodeData = (node.data ?? {}) as Record<string, any>;
        const originalConfig = nodeData.config || {};
        
        // Build previous outputs map for template resolution
        const previousOutputs: Record<string, any> = {};
        sourceNodeIds.forEach((sourceId) => {
          const output = nodeOutputs.get(sourceId);
          if (output !== undefined) {
            previousOutputs[sourceId] = output;
          }
        });
        
        // Resolve templates in config
        const resolvedConfig = resolveConfigTemplates(originalConfig, inputData, previousOutputs);
        
        // Update node data with resolved config for execution
        const nodeWithResolvedConfig = {
          ...node,
          data: {
            ...nodeData,
            config: resolvedConfig
          }
        };
        
        // Execute the node with resolved config
        const nodeOutput = await executeNode(nodeWithResolvedConfig, inputData, context);

        const duration = Date.now() - nodeStartTime;

        // Store output for this node
        nodeOutputs.set(node.id, nodeOutput);

        // Record successful execution
        nodeResults.push({
          nodeId: node.id,
          nodeName: nodeLabel,
          status: 'success',
          outputData: nodeOutput,
          duration,
          logs: nodeLogs,
        });

        logs.push({
          level: 'info',
          message: `Node completed successfully: ${nodeLabel}`,
          data: { duration, outputKeys: Object.keys(nodeOutput || {}) },
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        const duration = Date.now() - nodeStartTime;

        // Normalize the error
        const nodeData = (node.data ?? {}) as Record<string, any>;
        const nodeId = typeof nodeData.nodeId === 'string' ? nodeData.nodeId : node.id;
        const normalizedError = normalizeError(error, {
          nodeName: nodeLabel,
          nodeType: nodeData.nodeId === 'CUSTOM_GENERATED' ? 'custom' : 'library',
          provider: detectProviderFromNode(nodeId, error),
        });

        // Record failed execution
        nodeResults.push({
          nodeId: node.id,
          nodeName: nodeLabel,
          status: 'failed',
          outputData: null,
          error: error.message || 'Unknown error', // Keep for backward compatibility
          normalizedError,
          duration,
          logs: nodeLogs,
        });

        logs.push({
          level: 'error',
          message: normalizedError.title,
          data: { error: normalizedError.message, code: normalizedError.code },
          timestamp: new Date().toISOString(),
        });

        // Throw normalized error to stop execution
        const executionError = new Error(normalizedError.message);
        (executionError as any).normalizedError = normalizedError;
        throw executionError;
      }
    }

    // Get final output (last node's output or merged outputs if multiple end nodes)
    const endNodes = sortedNodes.filter((node) => {
      const nodeId = node.id;
      // Check if this node has no outgoing edges (it's an end node)
      return !edges.some((edge) => edge.source === nodeId);
    });

    let finalOutput: any;
    if (endNodes.length === 0) {
      // No end nodes, use last node's output
      finalOutput = nodeOutputs.get(sortedNodes[sortedNodes.length - 1]?.id) || null;
    } else if (endNodes.length === 1) {
      // Single end node
      finalOutput = nodeOutputs.get(endNodes[0].id) || null;
    } else {
      // Multiple end nodes, merge their outputs
      finalOutput = {};
      endNodes.forEach((node) => {
        const output = nodeOutputs.get(node.id);
        if (output !== undefined) {
          if (typeof output === 'object' && output !== null && !Array.isArray(output)) {
            Object.assign(finalOutput, output);
            finalOutput[`_from_${node.id}`] = output;
          } else {
            finalOutput[`_from_${node.id}`] = output;
          }
        }
      });
    }

    const completedAt = new Date().toISOString();
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    
    // Generate execution summary
    const summary: ExecutionSummary = {
      status: 'success',
      message: `Workflow completed successfully. All ${nodeResults.length} node${nodeResults.length !== 1 ? 's' : ''} executed.`,
      completedNodes: nodeResults.length,
      totalNodes: nodeResults.length,
    };
    
    return {
      executionId,
      workflowId,
      status: 'success',
      startedAt,
      completedAt,
      duration,
      nodeResults,
      finalOutput,
      logs,
      summary,
    };
  } catch (error: any) {
    const completedAt = new Date().toISOString();
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    // Get normalized error if available
    const normalizedError = (error as any).normalizedError || normalizeError(error);
    
    // Find the failed node
    const failedNode = nodeResults.find(nr => nr.status === 'failed');
    
    // Generate execution summary
    const summary: ExecutionSummary = {
      status: 'failed',
      message: failedNode 
        ? `Execution stopped at "${failedNode.nodeName}". ${normalizedError.title}.`
        : `Workflow execution failed. ${normalizedError.title}.`,
      failedAtNode: failedNode?.nodeName,
      completedNodes: nodeResults.filter(nr => nr.status === 'success').length,
      totalNodes: nodeResults.length,
    };

    logs.push({
      level: 'error',
      message: normalizedError.title,
      data: { error: normalizedError.message, code: normalizedError.code },
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
      error: error.message || 'Unknown error', // Keep for backward compatibility
      normalizedError,
      logs,
      summary,
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

  // Get node definition from registry
  const nodeDef = nodeRegistry[nodeId];
  if (!nodeDef) {
    throw new Error(`Node not found in library: ${nodeId}`);
  }

  // Execute the node's function
  try {
    const output = await nodeDef.execute(inputData, config, context);
    return output;
  } catch (error: any) {
    // Preserve original error for better normalization
    throw error;
  }
}

/**
 * Detect provider from node ID or error message
 */
function detectProviderFromNode(nodeId: string, error: any): string | undefined {
  const lowerNodeId = nodeId.toLowerCase();
  const errorMessage = typeof error === 'string' ? error : error?.message || '';
  const lowerError = errorMessage.toLowerCase();

  // Check node ID
  if (lowerNodeId.includes('sendgrid') || lowerNodeId.includes('send-email')) return 'sendgrid';
  if (lowerNodeId.includes('twilio') || lowerNodeId.includes('send-sms')) return 'twilio';
  if (lowerNodeId.includes('openai') || lowerNodeId.includes('gpt')) return 'openai';
  if (lowerNodeId.includes('stripe')) return 'stripe';
  if (lowerNodeId.includes('slack')) return 'slack';
  if (lowerNodeId.includes('notion')) return 'notion';
  if (lowerNodeId.includes('airtable')) return 'airtable';
  if (lowerNodeId.includes('trello')) return 'trello';
  if (lowerNodeId.includes('github')) return 'github';
  if (lowerNodeId.includes('discord')) return 'discord';
  if (lowerNodeId.includes('twitter')) return 'twitter';
  if (lowerNodeId.includes('paypal')) return 'paypal';

  // Check error message
  if (lowerError.includes('sendgrid')) return 'sendgrid';
  if (lowerError.includes('twilio')) return 'twilio';
  if (lowerError.includes('openai')) return 'openai';
  if (lowerError.includes('stripe')) return 'stripe';
  if (lowerError.includes('slack')) return 'slack';
  if (lowerError.includes('notion')) return 'notion';
  if (lowerError.includes('airtable')) return 'airtable';
  if (lowerError.includes('trello')) return 'trello';
  if (lowerError.includes('github')) return 'github';
  if (lowerError.includes('discord')) return 'discord';
  if (lowerError.includes('twitter')) return 'twitter';
  if (lowerError.includes('paypal')) return 'paypal';

  return undefined;
}

/**
 * Creates execution context for nodes
 * Loads integration tokens from database
 */
async function createExecutionContext(userId: string, logs: LogEntry[]): Promise<ExecutionContext> {
  // Load integration tokens
  const { loadIntegrationTokensForExecution } = await import('@/lib/integrations/execution-tokens');
  const integrationTokens = await loadIntegrationTokensForExecution(userId);
  
  // Build auth object with integration tokens
  const auth: ExecutionContext['auth'] = {};
  
  // Add Google integration token if available
  if (integrationTokens.google) {
    auth.google = {
      token: integrationTokens.google.access_token
    };
  }
  
  // Add Slack integration token if available
  if (integrationTokens.slack) {
    auth.slack = {
      token: integrationTokens.slack.access_token
    };
  }
  
  // Add GitHub integration token if available
  if (integrationTokens.github) {
    auth.github = {
      token: integrationTokens.github.access_token
    };
  }
  
  // Add OpenAI API key if available
  if (integrationTokens.openai) {
    auth.openai = {
      apiKey: integrationTokens.openai.access_token
    };
  }
  
  // Add SendGrid API key if available
  if (integrationTokens.sendgrid) {
    auth.sendgrid = {
      apiKey: integrationTokens.sendgrid.access_token
    };
  }
  
  // Add Twilio credentials if available
  if (integrationTokens.twilio) {
    auth.twilio = {
      credentials: {
        accountSid: integrationTokens.twilio.access_token,
        authToken: integrationTokens.twilio.refresh_token || ''
      }
    };
  }
  
  // Add Stripe API key if available
  if (integrationTokens.stripe) {
    auth.stripe = {
      apiKey: integrationTokens.stripe.access_token
    };
  }
  
  // Add Discord token if available
  if (integrationTokens.discord) {
    auth.discord = {
      token: integrationTokens.discord.access_token
    };
  }
  
  // Add Twitter token if available
  if (integrationTokens.twitter) {
    auth.twitter = {
      token: integrationTokens.twitter.access_token
    };
  }
  
  // Add PayPal token if available
  if (integrationTokens.paypal) {
    auth.paypal = {
      token: integrationTokens.paypal.access_token
    };
  }
  
  return {
    userId,
    auth,
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

          const errDetail = errorData.message ?? errorData.error ?? errorData.errors ?? response.statusText;
          throw new Error(`HTTP ${response.status}: ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`);
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

          const errDetail = errorData.message ?? errorData.error ?? errorData.errors ?? response.statusText;
          throw new Error(`HTTP ${response.status}: ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`);
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

          const errDetail = errorData.message ?? errorData.error ?? errorData.errors ?? response.statusText;
          throw new Error(`HTTP ${response.status}: ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`);
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

          const errDetail = errorData.message ?? errorData.error ?? errorData.errors ?? response.statusText;
          throw new Error(`HTTP ${response.status}: ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`);
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

          const errDetail = errorData.message ?? errorData.error ?? errorData.errors ?? response.statusText;
          throw new Error(`HTTP ${response.status}: ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`);
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
