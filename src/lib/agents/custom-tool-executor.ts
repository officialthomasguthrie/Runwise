/**
 * Agent Custom Tool Executor
 * Runs builder-generated custom tools in the workflow sandbox.
 */

import { executeCustomCode, validateCustomCode } from '@/lib/workflow-execution/sandbox';
import type { ExecutionContext } from '@/lib/workflow-execution/types';
import type { AgentRunContext } from './types';
import type { ToolResult } from './tools';
import { getAgentCustomTools } from './custom-tools';

function buildAgentExecutionContext(userId: string): ExecutionContext {
  return {
    userId,
    auth: {},
    http: {
      get: async (url: string, options?: any) => {
        const response = await fetch(url, { method: 'GET', ...options });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      },
      post: async (url: string, data: any, options?: any) => {
        const body = typeof data === 'string' ? data : JSON.stringify(data ?? {});
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
          body,
          ...options,
        });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      },
      put: async (url: string, data: any, options?: any) => {
        const body = typeof data === 'string' ? data : JSON.stringify(data ?? {});
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
          body,
          ...options,
        });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      },
      patch: async (url: string, data: any, options?: any) => {
        const body = typeof data === 'string' ? data : JSON.stringify(data ?? {});
        const response = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
          body,
          ...options,
        });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      },
      delete: async (url: string, options?: any) => {
        const response = await fetch(url, { method: 'DELETE', ...options });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      },
    },
    logger: { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} },
  };
}

/**
 * Execute a custom tool by name. Loads the tool from DB, validates code, runs in sandbox.
 */
export async function executeCustomTool(
  toolName: string,
  toolParams: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const customTools = await getAgentCustomTools(context.agentId);
  const tool = customTools.find((t) => t.name === toolName);

  if (!tool) {
    return { success: false, error: `Custom tool not found: ${toolName}` };
  }

  const validation = validateCustomCode(tool.code);
  if (!validation.valid) {
    return { success: false, error: `Invalid custom tool code: ${validation.errors.join(', ')}` };
  }

  const executionContext = buildAgentExecutionContext(context.userId);
  const config = (tool.config_defaults ?? {}) as Record<string, any>;

  const result = await executeCustomCode(tool.code, toolParams, config, executionContext);

  if (result.success === false) {
    return { success: false, error: result.error ?? 'Custom tool execution failed' };
  }

  return { success: true, data: result.result };
}
