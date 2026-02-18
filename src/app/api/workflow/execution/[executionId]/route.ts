/**
 * API Route: /api/workflow/execution/[executionId]
 * Gets execution status and results from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { normalizeError } from '@/lib/workflow-execution/error-normalization';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ executionId: string }> }
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

    const { executionId } = await context.params;

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
    const executionRecord = execution as any;
    const nodeResultsList = (nodeResults || []) as any[];
    const logsList = (logs || []) as any[];

    // Normalize errors for node results and execution
    const normalizedNodeResults = nodeResultsList.map((nr) => {
      const nodeResult: any = {
        nodeId: nr.node_id,
        nodeName: nr.node_name,
        status: nr.status,
        outputData: nr.output_data,
        error: nr.error,
        duration: nr.duration_ms || 0,
        logs: logsList
          .filter((log) => log.node_result_id === nr.id)
          .map((log) => ({
            level: log.level,
            message: log.message,
            data: log.data,
            timestamp: log.timestamp,
          })),
      };

      // Normalize error if present
      if (nr.status === 'failed' && nr.error) {
        nodeResult.normalizedError = normalizeError(nr.error, {
          nodeName: nr.node_name,
        });
      }

      return nodeResult;
    });

    // Normalize execution-level error
    let normalizedExecutionError = undefined;
    if (executionRecord.status === 'failed' && executionRecord.error) {
      normalizedExecutionError = normalizeError(executionRecord.error);
    }

    // Generate execution summary
    const completedNodes = normalizedNodeResults.filter(nr => nr.status === 'success').length;
    const totalNodes = normalizedNodeResults.length;
    const failedNode = normalizedNodeResults.find(nr => nr.status === 'failed');
    
    const summary = executionRecord.status === 'success' ? {
      status: 'success' as const,
      message: `Workflow completed successfully. All ${totalNodes} node${totalNodes !== 1 ? 's' : ''} executed.`,
      completedNodes,
      totalNodes,
    } : {
      status: 'failed' as const,
      message: failedNode 
        ? `Execution stopped at "${failedNode.nodeName}". ${normalizedExecutionError?.title || 'An error occurred'}.`
        : `Workflow execution failed. ${normalizedExecutionError?.title || 'An error occurred'}.`,
      failedAtNode: failedNode?.nodeName,
      completedNodes,
      totalNodes,
    };

    const result = {
      executionId: executionRecord.id,
      workflowId: executionRecord.workflow_id,
      status: executionRecord.status,
      startedAt: executionRecord.started_at,
      completedAt: executionRecord.completed_at,
      duration: executionRecord.duration_ms || 0,
      nodeResults: normalizedNodeResults,
      finalOutput: executionRecord.final_output,
      error: executionRecord.error,
      normalizedError: normalizedExecutionError,
      summary,
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

