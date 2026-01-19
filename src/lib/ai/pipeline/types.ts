/**
 * Pipeline Type Definitions
 * Type definitions for the multi-stage workflow generation pipeline
 */

import type { Node, Edge } from '@xyflow/react';
import type { AIGeneratedWorkflow } from '@/lib/ai/types';

/**
 * Result from intent analysis step
 * Contains extracted requirements and intent from user prompt
 */
export interface IntentAnalysis {
  /** What the workflow should do (brief description) */
  goal: string;
  /** Required trigger types (e.g., "scheduled", "email", "webhook") */
  triggers: string[];
  /** Required action types (e.g., "send-email", "update-sheet", "notify") */
  actions: string[];
  /** Transformations needed (e.g., "format-data", "filter", "transform") */
  transforms: string[];
  /** Custom functionality needed (descriptions of what library can't do) */
  customRequirements: string[];
  /** Is this modifying an existing workflow? */
  isModification: boolean;
  /** Existing workflow context if this is a modification */
  existingContext?: {
    nodes: any[];
    edges: any[];
  };
}

/**
 * Result from node matching step
 * Contains the plan for which nodes to use and how to connect them
 */
export interface WorkflowPlan {
  /** Library nodes to use in the workflow */
  libraryNodes: Array<{
    /** Node ID from the library */
    id: string;
    /** Role in the workflow (e.g., "trigger", "transform", "action") */
    role: string;
    /** Reason for selecting this node */
    reason: string;
  }>;
  /** Custom nodes that need to be generated */
  customNodes: Array<{
    /** Name of the custom node */
    name: string;
    /** Type of node */
    type: 'trigger' | 'action' | 'transform';
    /** Requirements/functionality this node should provide */
    requirements: string;
    /** Reason why a custom node is needed */
    reason: string;
  }>;
  /** Planned connections between nodes */
  connections: Array<{
    /** Source node ID */
    from: string;
    /** Target node ID */
    to: string;
    /** Reason for this connection */
    reason: string;
  }>;
  /** Data flow mapping between nodes */
  dataFlow: Array<{
    /** Source node ID */
    source: string;
    /** Target node ID */
    target: string;
    /** Field name being passed */
    field: string;
  }>;
}

/**
 * Context passed between pipeline steps
 * Accumulates results from each step as the pipeline progresses
 */
export interface PipelineContext {
  /** Original user prompt */
  userPrompt: string;
  /** Available nodes from the library */
  availableNodes: Array<{
    id: string;
    name: string;
    type: 'trigger' | 'action' | 'transform';
    description: string;
    category: string;
    configSchema: Record<string, any>;
  }>;
  /** Existing nodes if modifying a workflow */
  existingNodes?: Node[];
  /** Existing edges if modifying a workflow */
  existingEdges?: Edge[];
  /** User's connected integrations and available resources */
  integrationContext?: {
    google?: {
      connected: boolean;
      spreadsheets?: Array<{ id: string; name: string }>;
    };
    slack?: {
      connected: boolean;
      channels?: Array<{ id: string; name: string }>;
    };
  };
  /** Intent analysis result (added after Step 1) */
  intent?: IntentAnalysis;
  /** Workflow plan result (added after Step 2) */
  plan?: WorkflowPlan;
  /** Generated workflow result (added after Step 3+) */
  workflow?: AIGeneratedWorkflow;
}

/**
 * Generic result wrapper for pipeline steps
 * Used by all pipeline steps to return success/error with data
 */
export interface StepResult<T> {
  /** Whether the step succeeded */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Token usage for this step */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

