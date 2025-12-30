/**
 * Client-side functions for workflow executions
 */

import { createClient } from '@/lib/supabase-client';
import type { Database } from '@/types/database';

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
    // Use explicit column selection to avoid relationship inference issues
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('id, workflow_id, user_id, status, trigger_type, trigger_data, input_data, output_data, error_message, execution_time_ms, started_at, completed_at, created_at')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error loading executions:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      return { executions: [], error: error.message || error.details || 'Failed to load executions' };
    }

    // Load workflow name separately
    let workflowName = 'Untitled Workflow';
    if (workflowId) {
      type WorkflowNameRow = Pick<Database['public']['Tables']['workflows']['Row'], 'name'>;
      const { data: workflow } = await supabase
        .from('workflows')
        .select('name')
        .eq('id', workflowId)
        .single<WorkflowNameRow>();
      
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
    // Use explicit column selection to avoid relationship inference issues
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('id, workflow_id, user_id, status, trigger_type, trigger_data, input_data, output_data, error_message, execution_time_ms, started_at, completed_at, created_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(100); // Limit to most recent 100

    if (error) {
      console.error('Error loading executions:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      return { executions: [], error: error.message || error.details || 'Failed to load executions' };
    }

    // Load workflow names separately if needed
    const workflowIds = [...new Set((data || []).map((exec: any) => exec.workflow_id).filter(Boolean))];
    const workflowNames: Record<string, string> = {};
    
    if (workflowIds.length > 0) {
      try {
        // Convert all workflow_ids to strings to handle both UUID and TEXT types
        const workflowIdStrings = workflowIds.map(id => String(id));
        
        type WorkflowNameWithIdRow = Pick<Database['public']['Tables']['workflows']['Row'], 'id' | 'name'>;
        const { data: workflows, error: workflowError } = await supabase
          .from('workflows')
          .select('id, name')
          .in('id', workflowIdStrings);
        
        if (workflowError) {
          // Log but don't fail - workflow names are optional
          console.warn('Could not load workflow names (non-critical):', {
            message: workflowError.message,
            details: workflowError.details,
            hint: workflowError.hint
          });
        } else if (workflows) {
          (workflows as WorkflowNameWithIdRow[]).forEach((wf) => {
            workflowNames[String(wf.id)] = wf.name;
          });
        }
      } catch (workflowNameError: any) {
        // Don't fail the whole request if workflow names can't be loaded
        console.warn('Error loading workflow names (non-critical):', workflowNameError);
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
      workflow_name: workflowNames[String(exec.workflow_id)] || 'Untitled Workflow',
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
    
    // Check if executionId is valid
    if (!executionId || executionId.trim() === '') {
      console.error('Invalid executionId provided:', executionId);
      return { nodeExecutions: [], error: 'Invalid execution ID' };
    }

    // Try node_executions first (schema.sql), then fallback to node_execution_results (workflow-execution-schema.sql)
    let data: any[] | null = null;
    let error: any = null;

    // First, try node_executions table (UUID-based)
    const { data: nodeExecData, error: nodeExecError } = await supabase
      .from('node_executions')
      .select('*')
      .eq('execution_id', executionId)
      .order('started_at', { ascending: true });

    if (nodeExecError) {
      // If node_executions doesn't exist or fails, try node_execution_results
      console.warn('node_executions query failed, trying node_execution_results:', nodeExecError);
      
      const { data: nodeResultData, error: nodeResultError } = await supabase
        .from('node_execution_results')
        .select('*')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: true });

      if (nodeResultError) {
        error = nodeResultError;
        console.error('Both node_executions and node_execution_results queries failed:', {
          nodeExecError,
          nodeResultError,
          executionId,
        });
      } else {
        data = nodeResultData;
        // Map node_execution_results structure to NodeExecution format
        if (data) {
          data = data.map((result: any) => ({
            id: result.id,
            execution_id: result.execution_id,
            node_id: result.node_id || result.node_name, // node_execution_results uses node_name
            status: result.status,
            input_data: result.input_data || {},
            output_data: result.output_data || result.final_output || {},
            error_message: result.error || result.error_message,
            execution_time_ms: result.duration_ms || result.execution_time_ms,
            started_at: result.created_at, // node_execution_results doesn't have started_at
            completed_at: result.created_at,
            created_at: result.created_at,
          }));
        }
      }
    } else {
      data = nodeExecData;
    }

    if (error) {
      console.error('Error loading node executions:', {
        error,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        errorCode: error.code,
        executionId,
      });
      return { 
        nodeExecutions: [], 
        error: error.message || error.details || 'Failed to load node executions' 
      };
    }

    // Handle case where data might be null
    if (!data) {
      console.warn('No data returned for node executions, executionId:', executionId);
      return { nodeExecutions: [] };
    }

    const nodeExecutions: NodeExecution[] = data.map((exec: any) => ({
      id: exec.id,
      execution_id: exec.execution_id,
      node_id: exec.node_id,
      status: exec.status,
      input_data: exec.input_data || {},
      output_data: exec.output_data || {},
      error_message: exec.error_message,
      execution_time_ms: exec.execution_time_ms,
      started_at: exec.started_at,
      completed_at: exec.completed_at,
      created_at: exec.created_at,
    }));

    return { nodeExecutions };
  } catch (error: any) {
    console.error('Error in loadNodeExecutions:', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      executionId,
    });
    return { 
      nodeExecutions: [], 
      error: error?.message || 'An unexpected error occurred while loading node executions' 
    };
  }
}

