/**
 * API Route: /api/workflow/execution/[executionId]
 * Gets execution status and results from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const executionId = params.executionId;

    // Get execution record
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .eq('user_id', user.id)
      .single();

    if (executionError || !execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Get node results
    const { data: nodeResults, error: nodeResultsError } = await supabase
      .from('node_execution_results')
      .select('*')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: true });

    // Get logs
    const { data: logs, error: logsError } = await supabase
      .from('execution_logs')
      .select('*')
      .eq('execution_id', executionId)
      .order('timestamp', { ascending: true });

    // Transform to match WorkflowExecutionResult format
    const result = {
      executionId: execution.id,
      workflowId: execution.workflow_id,
      status: execution.status,
      startedAt: execution.started_at,
      completedAt: execution.completed_at,
      duration: execution.duration_ms || 0,
      nodeResults: (nodeResults || []).map((nr) => ({
        nodeId: nr.node_id,
        nodeName: nr.node_name,
        status: nr.status,
        outputData: nr.output_data,
        error: nr.error,
        duration: nr.duration_ms || 0,
        logs: (logs || []).filter(log => 
          log.node_result_id === nr.id
        ).map(log => ({
          level: log.level,
          message: log.message,
          data: log.data,
          timestamp: log.timestamp,
        })),
      })),
      finalOutput: execution.final_output,
      error: execution.error,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in GET /api/workflow/execution/[executionId]:', error);
    return NextResponse.json(
      {
        error: 'Failed to get execution status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

