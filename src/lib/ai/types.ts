/**
 * AI Integration Types
 * Type definitions for AI workflow generation and chat
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeDefinition } from '@/lib/nodes/types';

/**
 * AI-generated workflow structure
 */
export interface AIGeneratedWorkflow {
  nodes: Array<{
    id: string;
    type: 'workflow-node';
    position: { x: number; y: number };
    data: {
      nodeId: string; // ID from node library
      config: Record<string, any>; // Node configuration
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: 'buttonedge';
    animated: boolean;
    style?: {
      stroke: string;
      strokeWidth: number;
    };
  }>;
  reasoning: string; // AI's explanation of the workflow
  missingNodes?: string[]; // Custom nodes that would need to be generated
  workflowName?: string; // Suggested workflow name
}

/**
 * Request for workflow generation
 */
export interface WorkflowGenerationRequest {
  userPrompt: string;
  availableNodes: Array<{
    id: string;
    name: string;
    type: 'trigger' | 'action' | 'transform';
    description: string;
    category: string;
    configSchema: Record<string, any>;
  }>;
  existingNodes?: Node[]; // If modifying existing workflow
  existingEdges?: Edge[]; // If modifying existing workflow
  integrationContext?: {
    google?: {
      connected: boolean;
      spreadsheets?: Array<{ id: string; name: string }>;
    };
    slack?: {
      connected: boolean;
      channels?: Array<{ id: string; name: string }>;
    };
  }; // User's connected integrations and available resources
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  workflowGenerated?: boolean; // If this message generated a workflow
  workflowGeneratedSuccess?: boolean; // If this is the "Workflow Generated Successfully" message (for styling)
  workflowId?: string; // ID of generated workflow
  isPaywallMessage?: boolean; // If this is a paywall message
}

/**
 * Chat request
 */
export interface ChatRequest {
  message: string;
  chatId: string;
  conversationHistory?: ChatMessage[];
  context?: {
    workflowId?: string;
    workflowName?: string;
    fieldName?: string;
    nodeType?: string;
    nodeId?: string;
  };
  integrationContext?: {
    google?: {
      connected: boolean;
      spreadsheets?: Array<{ id: string; name: string }>;
    };
    slack?: {
      connected: boolean;
      channels?: Array<{ id: string; name: string }>;
    };
  }; // User's connected integrations and available resources
}

/**
 * Chat response
 */
export interface ChatResponse {
  message: string;
  suggestions?: string[]; // Suggested follow-up questions
  shouldGenerateWorkflow?: boolean; // If AI detected workflow intent
  workflowPrompt?: string; // Extracted workflow prompt if detected
}

/**
 * Workflow generation response
 */
export interface WorkflowGenerationResponse {
  success: boolean;
  workflow: AIGeneratedWorkflow;
  error?: string;
}

