/**
 * Node Library Types and Interfaces
 * Defines the structure for all workflow nodes
 */

export type NodeType = 'trigger' | 'action' | 'transform';

export interface NodeInputSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  description: string;
  required?: boolean;
}

export interface NodeOutputSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  description: string;
}

export interface NodeConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'select' | 'textarea' | 'integration';
    label: string;
    description: string;
    required?: boolean;
    default?: any;
    placeholder?: string; // UI hint shown inside the input field
    options?: Array<{ label: string; value: string }>; // For select type
    integrationType?: string; // For integration type
    resourceType?: string; // For integration type
    serviceName?: string; // For integration type
  };
}

export interface ExecutionContext {
  userId: string;
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
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    error: (message: string, error?: any) => void;
    warn: (message: string, data?: any) => void;
  };
}

export type NodeExecuteFunction = (
  inputData: any,
  config: Record<string, any>,
  context: ExecutionContext
) => Promise<any>;

export interface NodeDefinition {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  icon: string; // Lucide icon name
  category: string;
  inputs: NodeInputSchema[];
  outputs: NodeOutputSchema[];
  configSchema: NodeConfigSchema;
  execute: NodeExecuteFunction;
  code: string; // JavaScript/TypeScript code string
}

export interface NodeRegistry {
  [nodeId: string]: NodeDefinition;
}

