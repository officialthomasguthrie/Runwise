/**
 * Workflow Execution Types
 * Types for executing workflows with both library and custom nodes
 */

import type { Node, Edge } from '@xyflow/react';

/**
 * Execution context provided to nodes during execution
 */
export interface ExecutionContext {
  auth: {
    [service: string]: {
      token?: string;
      apiKey?: string;
      credentials?: any;
    };
  };
  http: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data: any, options?: any) => Promise<any>;
    put: (url: string, data: any, options?: any) => Promise<any>;
    patch: (url: string, data: any, options?: any) => Promise<any>;
    delete: (url: string, options?: any) => Promise<any>;
  };
  logger: {
    info: (message: string, data?: any) => void;
    error: (message: string, error?: any) => void;
    warn: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
  };
}

/**
 * Result of a single node execution
 */
export interface NodeExecutionResult {
  nodeId: string;
  nodeName: string;
  status: 'success' | 'failed' | 'skipped';
  outputData: any;
  error?: string;
  duration: number; // milliseconds
  logs: LogEntry[];
}

/**
 * Log entry from node execution
 */
export interface LogEntry {
  level: 'info' | 'error' | 'warn' | 'debug';
  message: string;
  data?: any;
  timestamp: string;
}

/**
 * Complete workflow execution result
 */
export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'success' | 'failed' | 'partial';
  startedAt: string;
  completedAt: string;
  duration: number; // milliseconds
  nodeResults: NodeExecutionResult[];
  finalOutput: any;
  error?: string;
}

/**
 * Custom node definition with generated code
 */
export interface CustomNodeDefinition {
  id: string;
  name: string;
  description: string;
  type: 'trigger' | 'action' | 'transform';
  customCode: string; // JavaScript function code
  metadata: {
    generatedBy: 'ai' | 'user';
    generatedAt: string;
    prompt?: string;
  };
}

/**
 * Workflow execution request
 */
export interface ExecuteWorkflowRequest {
  workflowId: string;
  nodes: Node[];
  edges: Edge[];
  triggerData?: any; // Initial data for trigger node
  userId: string;
}

/**
 * Execution status for real-time updates
 */
export interface ExecutionStatus {
  executionId: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  currentNode?: string;
  progress: number; // 0-100
  message?: string;
}
