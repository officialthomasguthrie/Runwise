/**
 * Client-side functions for workflow executions
 */

import { createClient } from '@/lib/supabase-client';

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  user_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  trigger_type: string;
  trigger_data: any;
  input_data: any;
  output_data: any;
  error_message: string | null;
  execution_time_ms: number | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  workflow_name?: string; // From join
}

export interface NodeExecution {
  id: string;
  execution_id: string;
  node_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input_data: any;
  output_data: any;
  error_message: string | null;
  execution_time_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Load all executions for a workflow
 */
export async function loadWorkflowExecutions(
  workflowId: string
): Promise<{ executions: WorkflowExecution[]; error?: string }> {
  try {
    const supabase = createClient();
    
    // First, load executions without join
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error loading executions:', error);
      return { executions: [], error: error.message || 'Failed to load executions' };
    }

    // Load workflow name separately
    let workflowName = 'Untitled Workflow';
    if (workflowId) {
      const { data: workflow } = await supabase
        .from('workflows')
        .select('name')
        .eq('id', workflowId)
        .single();
      
      if (workflow) {
        workflowName = workflow.name;
      }
    }

    const executions: WorkflowExecution[] = (data || []).map((exec: any) => ({
      id: exec.id,
      workflow_id: exec.workflow_id,
      user_id: exec.user_id,
      status: exec.status,
      trigger_type: exec.trigger_type,
      trigger_data: exec.trigger_data,
      input_data: exec.input_data,
      output_data: exec.output_data,
      error_message: exec.error_message,
      execution_time_ms: exec.execution_time_ms,
      started_at: exec.started_at,
      completed_at: exec.completed_at,
      created_at: exec.created_at,
      workflow_name: workflowName,
    }));

    return { executions };
  } catch (error: any) {
    console.error('Error in loadWorkflowExecutions:', error);
    return { executions: [], error: error.message };
  }
}

/**
 * Load all executions for the current user
 */
export async function loadUserExecutions(): Promise<{
  executions: WorkflowExecution[];
  error?: string;
}> {
  try {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { executions: [], error: 'Not authenticated' };
    }

    // First, load executions without join (simpler and more reliable)
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(100); // Limit to most recent 100

    if (error) {
      console.error('Error loading executions:', error);
      return { executions: [], error: error.message || 'Failed to load executions' };
    }

    // Load workflow names separately if needed
    const workflowIds = [...new Set((data || []).map((exec: any) => exec.workflow_id))];
    const workflowNames: Record<string, string> = {};
    
    if (workflowIds.length > 0) {
      const { data: workflows } = await supabase
        .from('workflows')
        .select('id, name')
        .in('id', workflowIds);
      
      if (workflows) {
        workflows.forEach((wf: any) => {
          workflowNames[wf.id] = wf.name;
        });
      }
    }

    const executions: WorkflowExecution[] = (data || []).map((exec: any) => ({
      id: exec.id,
      workflow_id: exec.workflow_id,
      user_id: exec.user_id,
      status: exec.status,
      trigger_type: exec.trigger_type,
      trigger_data: exec.trigger_data,
      input_data: exec.input_data,
      output_data: exec.output_data,
      error_message: exec.error_message,
      execution_time_ms: exec.execution_time_ms,
      started_at: exec.started_at,
      completed_at: exec.completed_at,
      created_at: exec.created_at,
      workflow_name: workflowNames[exec.workflow_id] || 'Untitled Workflow',
    }));

    return { executions };
  } catch (error: any) {
    console.error('Error in loadUserExecutions:', error);
    return { executions: [], error: error.message };
  }
}

/**
 * Load node executions for a workflow execution
 */
export async function loadNodeExecutions(
  executionId: string
): Promise<{ nodeExecutions: NodeExecution[]; error?: string }> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('node_executions')
      .select('*')
      .eq('execution_id', executionId)
      .order('started_at', { ascending: true });

    if (error) {
      console.error('Error loading node executions:', error);
      return { nodeExecutions: [], error: error.message };
    }

    const nodeExecutions: NodeExecution[] = (data || []).map((exec: any) => ({
      id: exec.id,
      execution_id: exec.execution_id,
      node_id: exec.node_id,
      status: exec.status,
      input_data: exec.input_data,
      output_data: exec.output_data,
      error_message: exec.error_message,
      execution_time_ms: exec.execution_time_ms,
      started_at: exec.started_at,
      completed_at: exec.completed_at,
      created_at: exec.created_at,
    }));

    return { nodeExecutions };
  } catch (error: any) {
    console.error('Error in loadNodeExecutions:', error);
    return { nodeExecutions: [], error: error.message };
  }
}

