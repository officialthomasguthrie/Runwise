/**
 * Workflow Storage Types
 * Type definitions for workflow storage and serialization
 */

import type { Node, Edge } from '@xyflow/react';

export interface WorkflowData {
  nodes: Node[];
  edges: Edge[];
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  status: 'draft' | 'active' | 'paused' | 'archived';
  workflow_data: WorkflowData;
  ai_prompt?: string | null;
  ai_generated: boolean;
  version: number;
  execution_count: number;
  last_executed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  workflow_data: WorkflowData;
  ai_prompt?: string;
  ai_generated?: boolean;
  status?: 'draft' | 'active' | 'paused' | 'archived';
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  workflow_data?: WorkflowData;
  ai_prompt?: string;
  status?: 'draft' | 'active' | 'paused' | 'archived';
}

