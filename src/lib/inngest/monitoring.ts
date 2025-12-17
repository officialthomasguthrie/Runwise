/**
 * Inngest Function Execution Monitoring
 * Tracks function executions for quota monitoring and cost analysis
 */

import { createAdminClient } from '@/lib/supabase-admin';

export interface InngestExecutionLog {
  functionId: string;
  functionName: string;
  eventId?: string;
  eventName?: string;
  runId?: string;
  userId?: string;
  workflowId?: string;
  executionId?: string;
  triggerType?: string;
  metadata?: Record<string, any>;
}

/**
 * Log the start of an Inngest function execution
 */
export async function logInngestExecutionStart(
  log: InngestExecutionLog
): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await (supabase
      .from('inngest_function_executions') as any)
      .insert({
        function_id: log.functionId,
        function_name: log.functionName,
        event_id: log.eventId || null,
        event_name: log.eventName || null,
        run_id: log.runId || null,
        user_id: log.userId || null,
        workflow_id: log.workflowId || null,
        execution_id: log.executionId || null,
        trigger_type: log.triggerType || null,
        status: 'started',
        metadata: log.metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Inngest Monitoring] Error logging execution start:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('[Inngest Monitoring] Unexpected error logging execution start:', error);
    return null;
  }
}

/**
 * Update an Inngest function execution with completion status
 */
export async function logInngestExecutionComplete(
  executionLogId: string,
  status: 'completed' | 'failed' | 'cancelled',
  options?: {
    durationMs?: number;
    stepCount?: number;
    errorMessage?: string;
    errorStack?: string;
  }
): Promise<void> {
  try {
    const supabase = createAdminClient();
    
    const updateData: any = {
      status,
      completed_at: new Date().toISOString(),
    };

    if (options?.durationMs !== undefined) {
      updateData.duration_ms = options.durationMs;
    }

    if (options?.stepCount !== undefined) {
      updateData.step_count = options.stepCount;
    }

    if (options?.errorMessage) {
      updateData.error_message = options.errorMessage;
    }

    if (options?.errorStack) {
      updateData.error_stack = options.errorStack;
    }

    const { error } = await (supabase
      .from('inngest_function_executions') as any)
      .update(updateData)
      .eq('id', executionLogId);

    if (error) {
      console.error('[Inngest Monitoring] Error logging execution completion:', error);
    }
  } catch (error) {
    console.error('[Inngest Monitoring] Unexpected error logging execution completion:', error);
  }
}

/**
 * Get Inngest usage statistics
 */
export async function getInngestUsageStats(options?: {
  startDate?: Date;
  endDate?: Date;
  functionId?: string;
  userId?: string;
}): Promise<{
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalSteps: number;
  totalDurationMs: number;
  averageDurationMs: number;
  byFunction: Array<{
    functionId: string;
    functionName: string;
    count: number;
    steps: number;
    avgDuration: number;
  }>;
  byTriggerType: Array<{
    triggerType: string;
    count: number;
  }>;
}> {
  try {
    const supabase = createAdminClient();
    
    let query = (supabase
      .from('inngest_function_executions') as any)
      .select('*');

    if (options?.startDate) {
      query = query.gte('started_at', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('started_at', options.endDate.toISOString());
    }

    if (options?.functionId) {
      query = query.eq('function_id', options.functionId);
    }

    if (options?.userId) {
      query = query.eq('user_id', options.userId);
    }

    const { data: executions, error } = await query;

    if (error) {
      console.error('[Inngest Monitoring] Error fetching usage stats:', error);
      throw error;
    }

    const totalExecutions = executions?.length || 0;
    const successfulExecutions = executions?.filter((e: any) => e.status === 'completed').length || 0;
    const failedExecutions = executions?.filter((e: any) => e.status === 'failed').length || 0;
    const totalSteps = executions?.reduce((sum: number, e: any) => sum + (e.step_count || 0), 0) || 0;
    const totalDurationMs = executions?.reduce((sum: number, e: any) => sum + (e.duration_ms || 0), 0) || 0;
    const averageDurationMs = totalExecutions > 0 ? totalDurationMs / totalExecutions : 0;

    // Group by function
    const functionMap = new Map<string, { name: string; count: number; steps: number; durations: number[] }>();
    executions?.forEach((exec: any) => {
      const funcId = exec.function_id;
      if (!functionMap.has(funcId)) {
        functionMap.set(funcId, {
          name: exec.function_name || funcId,
          count: 0,
          steps: 0,
          durations: [],
        });
      }
      const func = functionMap.get(funcId)!;
      func.count++;
      func.steps += exec.step_count || 0;
      if (exec.duration_ms) {
        func.durations.push(exec.duration_ms);
      }
    });

    const byFunction = Array.from(functionMap.entries()).map(([functionId, data]) => ({
      functionId,
      functionName: data.name,
      count: data.count,
      steps: data.steps,
      avgDuration: data.durations.length > 0
        ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
        : 0,
    }));

    // Group by trigger type
    const triggerMap = new Map<string, number>();
    executions?.forEach((exec: any) => {
      const triggerType = exec.trigger_type || 'unknown';
      triggerMap.set(triggerType, (triggerMap.get(triggerType) || 0) + 1);
    });

    const byTriggerType = Array.from(triggerMap.entries()).map(([triggerType, count]) => ({
      triggerType,
      count,
    }));

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      totalSteps,
      totalDurationMs,
      averageDurationMs,
      byFunction,
      byTriggerType,
    };
  } catch (error) {
    console.error('[Inngest Monitoring] Error getting usage stats:', error);
    throw error;
  }
}

