/**
 * Client-side Workflow API Functions
 * Utility functions for interacting with workflow API from the client
 */

import type { Workflow, CreateWorkflowInput, UpdateWorkflowInput } from './types';
import { serializeWorkflow } from './utils';
import type { Node, Edge } from '@xyflow/react';

const API_BASE = '/api/workflows';

/**
 * List all workflows for the current user
 */
export async function listWorkflows(params?: {
  status?: 'draft' | 'active' | 'paused' | 'archived';
  limit?: number;
  offset?: number;
}): Promise<{ workflows: Workflow[]; count: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append('status', params.status);
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());
  
  const url = `${API_BASE}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch workflows');
  }
  
  return response.json();
}

/**
 * Get a single workflow by ID
 */
export async function getWorkflow(id: string): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch workflow');
  }
  
  const data = await response.json();
  return data.workflow;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create workflow');
  }
  
  const data = await response.json();
  return data.workflow;
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
  id: string,
  input: UpdateWorkflowInput
): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update workflow');
  }
  
  const data = await response.json();
  return data.workflow;
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete workflow');
  }
}

/**
 * Save workflow from React Flow editor
 * This is a convenience function that serializes nodes/edges and saves
 * Automatically handles create vs update by checking if workflow exists
 */
export async function saveWorkflowFromEditor(
  workflowId: string | null,
  name: string,
  nodes: Node[],
  edges: Edge[],
  options?: {
    description?: string;
    ai_prompt?: string;
    status?: 'draft' | 'active' | 'paused' | 'archived';
  }
): Promise<Workflow> {
  const workflowData = serializeWorkflow(nodes, edges);
  
  if (workflowId) {
    // Try to check if workflow exists first
    try {
      const existingWorkflow = await getWorkflow(workflowId);
      
      // Workflow exists - update it
      console.log('🔄 Updating existing workflow:', workflowId);
      return updateWorkflow(workflowId, {
        name,
        description: options?.description,
        workflow_data: workflowData,
        ai_prompt: options?.ai_prompt,
        status: options?.status,
      });
    } catch (error: any) {
      // Workflow doesn't exist - create a new one
      console.log('✨ Creating new workflow (ID not found)');
      return createWorkflow({
        name,
        description: options?.description,
        workflow_data: workflowData,
        ai_prompt: options?.ai_prompt,
        ai_generated: !!options?.ai_prompt,
        status: options?.status || 'draft',
      });
    }
  } else {
    // No ID provided - create new workflow
    console.log('✨ Creating new workflow (no ID)');
    return createWorkflow({
      name,
      description: options?.description,
      workflow_data: workflowData,
      ai_prompt: options?.ai_prompt,
      ai_generated: !!options?.ai_prompt,
      status: options?.status || 'draft',
    });
  }
}

