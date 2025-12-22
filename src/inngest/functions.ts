import { inngest } from "./client";
import { executeWorkflow } from "@/lib/workflow-execution/executor";
import { createAdminClient } from "@/lib/supabase-admin";
import type { Database } from "@/types/database";
import type { Node, Edge } from "@xyflow/react";
import { assertWithinLimit, incrementUsage } from "@/lib/usage";
import { getPlanLimits, subscriptionTierToPlanId } from "@/lib/plans/config";
import { hasScheduledTrigger, getScheduleConfig } from "@/lib/workflows/schedule-utils";
// @ts-ignore - cron-parser has incorrect type definitions
import parseExpression from "cron-parser";
import { scheduleNextWorkflowRun } from "@/lib/workflows/schedule-scheduler";
import { logInngestExecutionStart, logInngestExecutionComplete } from "@/lib/inngest/monitoring";

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Simple hello world function for testing
 */
export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data?.name || "World"}!` };
  },
);

/**
 * Test workflow execution with a simple example
 */
export const testWorkflow = inngest.createFunction(
  { id: "test-workflow" },
  { event: "test/workflow" },
  async ({ event, step }) => {
    const result = await step.run("execute-test", async () => {
      return {
        success: true,
        message: "Test workflow executed successfully",
        data: event.data,
      };
    });

    return result;
  },
);

/**
 * Send test notification
 */
export const sendTestNotification = inngest.createFunction(
  { id: "send-test-notification" },
  { event: "test/notification" },
  async ({ event, step }) => {
    const notification = await step.run("create-notification", async () => {
      return {
        message: event.data?.message || "Test notification",
        timestamp: new Date().toISOString(),
      };
    });

    await step.sleep("wait-before-complete", "500ms");

    return {
      sent: true,
      notification,
    };
  },
);

// ============================================================================
// WORKFLOW EXECUTOR
// ============================================================================

/**
 * Workflow Executor Function
 * Executes AI-generated workflows through Inngest for reliable async execution
 */
export const workflowExecutor = inngest.createFunction(
  { 
    id: "workflow-executor",
    retries: 3, // Automatic retries on failure
    concurrency: {
      limit: 5, // Match current plan limit
      key: "event.data.userId",
    },
  },
  { event: "workflow/execute" },
  async ({ event, step, runId }) => {
    const { workflowId, nodes, edges, triggerData, userId, triggerType = 'manual' } = event.data;
    const startTime = Date.now();
    let stepCount = 0;
    let executionLogId: string | null = null;

    // Log execution start
    try {
      executionLogId = await logInngestExecutionStart({
        functionId: 'workflow-executor',
        functionName: 'Workflow Executor',
        eventId: event.id,
        eventName: event.name,
        runId: runId,
        userId: userId,
        workflowId: workflowId,
        triggerType: triggerType,
        metadata: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
        },
      });
    } catch (error) {
      console.error('[Monitoring] Failed to log execution start:', error);
      // Don't fail the execution if monitoring fails
    }

    // Validate input
    if (!workflowId || !nodes || !Array.isArray(nodes) || !edges || !Array.isArray(edges)) {
      const error = new Error("Invalid workflow execution request: missing required fields");
      if (executionLogId) {
        await logInngestExecutionComplete(executionLogId, 'failed', {
          durationMs: Date.now() - startTime,
          stepCount: 0,
          errorMessage: error.message,
        });
      }
      throw error;
    }

    // Step 0.5: Check if workflow is active (skip for manual/test executions)
    if (triggerType !== 'manual' && triggerType !== 'test') {
      const workflowStatus = await step.run("check-workflow-status", async () => {
        stepCount++;
        const supabase = createAdminClient();
        const { data: workflow, error } = await (supabase as any)
          .from('workflows')
          .select('id, status')
          .eq('id', workflowId)
          .single();

        if (error) {
          console.error('Error checking workflow status:', error);
          return null;
        }

        return workflow?.status;
      });

      if (workflowStatus !== 'active') {
        console.log(`Workflow ${workflowId} is not active (status: ${workflowStatus}), skipping execution`);
        // Log skipped execution
        if (executionLogId) {
          try {
            await logInngestExecutionComplete(executionLogId, 'cancelled', {
              durationMs: Date.now() - startTime,
              stepCount: stepCount,
              errorMessage: `Workflow is not active (status: ${workflowStatus})`,
            });
          } catch (error) {
            console.error('[Monitoring] Failed to log skipped execution:', error);
          }
        }
        return {
          skipped: true,
          reason: `Workflow is not active (status: ${workflowStatus})`,
          workflowId,
        };
      }
    }

    // Step 0: Fetch user's plan and check limits
    const planCheck = await step.run("check-plan-and-limits", async () => {
      stepCount++;
      try {
        const supabaseForPlan = createAdminClient();
        const { data: userRow, error: userError } = await supabaseForPlan
          .from("users")
          .select("id, subscription_tier")
          .eq("id", userId)
          .single();
        
        if (userError) {
          console.error('Error fetching user plan:', userError);
          // Default to personal plan if user lookup fails
          return { planId: "personal" };
        }
        
        const subscriptionTier = (userRow as any)?.subscription_tier || "free";
        const planId = subscriptionTierToPlanId(subscriptionTier);

        // Enforce executions limit (pre-check)
        try {
          await assertWithinLimit(userId, planId, "executions");
        } catch (limitError: any) {
          // If limit check fails, throw the error
          throw new Error(`Limit check failed: ${limitError.message}`);
        }

        return { planId };
      } catch (error: any) {
        console.error('Error in check-plan-and-limits step:', error);
        throw error;
      }
    });

    // Step 1: Create initial execution record in database
    const executionRecord = await step.run("create-execution-record", async () => {
      const supabase = createAdminClient();
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await (supabase
        .from('workflow_executions') as any)
        .insert({
          id: executionId,
          workflow_id: workflowId,
          user_id: userId,
          status: 'running',
          trigger_type: triggerType,
          trigger_data: triggerData || {},
          started_at: new Date().toISOString(),
        });

      if (error) {
        throw new Error(`Failed to create execution record: ${error.message}`);
      }

      return { executionId };
    });

    // Step 2: Execute the workflow (with executionId pre-determined)
    const executionResult = await step.run("execute-workflow", async () => {
      stepCount++;
      try {
        // Execute workflow - we'll need to modify executor to accept executionId
        // For now, we'll execute and then update the ID
        const result = await executeWorkflow(
          workflowId,
          nodes as Node[],
          edges as Edge[],
          triggerData || {},
          userId
        );
        
        // Override the executionId to match our database record
        result.executionId = executionRecord.executionId;
        
        return result;
      } catch (error: any) {
        // Update execution record with error
        const supabase = createAdminClient();
        await (supabase
          .from('workflow_executions') as any)
          .update({
            status: 'failed',
            error: error.message || 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', executionRecord.executionId);

        throw error;
      }
    });

    // Step 3: Save execution results to database
    await step.run("save-execution-results", async () => {
      stepCount++;
      const supabase = createAdminClient();

      // Update execution record
      const { error: executionError } = await (supabase
        .from('workflow_executions') as any)
        .update({
          id: executionResult.executionId,
          status: executionResult.status,
          completed_at: executionResult.completedAt,
          duration_ms: executionResult.duration,
          final_output: executionResult.finalOutput,
          error: executionResult.error || null,
        })
        .eq('id', executionRecord.executionId);

      if (executionError) {
        console.error('Error updating execution record:', executionError);
        // Don't throw - execution completed, just couldn't save
      }

      // Insert node results
      if (executionResult.nodeResults && executionResult.nodeResults.length > 0) {
        const nodeResultsData = executionResult.nodeResults.map((nodeResult) => ({
          execution_id: executionResult.executionId,
          node_id: nodeResult.nodeId,
          node_name: nodeResult.nodeName,
          status: nodeResult.status,
          output_data: nodeResult.outputData,
          error: nodeResult.error || null,
          duration_ms: nodeResult.duration,
        }));

        const { error: nodeResultsError } = await (supabase
          .from('node_execution_results') as any)
          .insert(nodeResultsData);

        if (nodeResultsError) {
          console.error('Error saving node results:', nodeResultsError);
        }

        // Insert logs
        const allLogs = executionResult.nodeResults.flatMap((nodeResult) => {
          if (!nodeResult.logs || nodeResult.logs.length === 0) return [];
          return nodeResult.logs.map((log) => ({
            execution_id: executionResult.executionId,
            node_result_id: null,
            level: log.level,
            message: log.message,
            data: log.data || null,
            timestamp: log.timestamp,
          }));
        });

        if (allLogs.length > 0) {
          const { error: logsError } = await (supabase
            .from('execution_logs') as any)
            .insert(allLogs);

          if (logsError) {
            console.error('Error saving logs:', logsError);
          }
        }
      }

      return { saved: true };
    });

    // Step 4: Increment usage counter for executions
    await step.run("increment-usage", async () => {
      stepCount++;
      await incrementUsage(userId, "executions", 1, {
        workflowId,
        executionId: executionResult.executionId,
      });
    });

    // Log execution completion
    if (executionLogId) {
      try {
        await logInngestExecutionComplete(executionLogId, 'completed', {
          durationMs: Date.now() - startTime,
          stepCount: stepCount,
        });
      } catch (error) {
        console.error('[Monitoring] Failed to log execution completion:', error);
        // Don't fail the execution if monitoring fails
      }
    }

    return {
      executionId: executionResult.executionId,
      status: executionResult.status,
      duration: executionResult.duration,
      nodeCount: executionResult.nodeResults?.length || 0,
    };
  },
);

// ============================================================================
// SCHEDULED WORKFLOW TRIGGER (Event-Based)
// ============================================================================

/**
 * Scheduled Workflow Trigger Function (Event-Based)
 * Triggered by delayed events scheduled for specific times
 * Executes the workflow and schedules the next occurrence
 */
export const scheduledWorkflowTrigger = inngest.createFunction(
  {
    id: "scheduled-workflow-trigger",
    name: "Scheduled Workflow Trigger",
  },
  { event: "workflow/scheduled-trigger" },
  async ({ event, step, runId }) => {
    const startTime = Date.now();
    let stepCount = 0;
    let executionLogId: string | null = null;

    // Log execution start
    try {
      executionLogId = await logInngestExecutionStart({
        functionId: 'scheduled-workflow-trigger',
        functionName: 'Scheduled Workflow Trigger',
        eventId: event.id,
        eventName: event.name,
        runId: runId,
        userId: event.data.userId,
        workflowId: event.data.workflowId,
        triggerType: 'scheduled',
        metadata: {
          cronExpression: event.data.cronExpression,
          timezone: event.data.timezone,
        },
      });
    } catch (error) {
      console.error('[Monitoring] Failed to log scheduled trigger start:', error);
    }

    try {
    const {
      workflowId,
      nodes,
      edges,
      userId,
      cronExpression,
      timezone,
      nextRunTime, // ISO string of when to execute
    } = event.data;

    // Step 1: Sleep until the scheduled time (EFFICIENT - doesn't consume usage while sleeping!)
    // This is the key efficiency improvement - we sleep until the exact execution time
    // If nextRunTime is not provided, calculate it from cron expression (backward compatibility)
    let executionTime: Date;
    if (nextRunTime) {
      executionTime = new Date(nextRunTime);
    } else {
      // Fallback: calculate next run time from cron (for events sent without nextRunTime)
      const { calculateNextRunTime } = await import('@/lib/workflows/schedule-scheduler');
      executionTime = calculateNextRunTime(cronExpression, timezone);
      console.log(
        `[Scheduled Trigger] Workflow ${workflowId} - nextRunTime not provided, calculated: ${executionTime.toISOString()}`
      );
    }
    
    const now = new Date();
    
    // Only sleep if the time is in the future
    if (executionTime.getTime() > now.getTime()) {
      const sleepDuration = executionTime.getTime() - now.getTime();
      console.log(
        `[Scheduled Trigger] Workflow ${workflowId} sleeping for ${Math.floor(sleepDuration / 1000)}s until ${executionTime.toISOString()}`
      );
      await step.sleepUntil("wait-for-scheduled-time", executionTime);
    } else {
      console.log(
        `[Scheduled Trigger] Workflow ${workflowId} scheduled time ${executionTime.toISOString()} is in the past, executing immediately`
      );
    }

    // Step 2: Verify workflow is still active before executing
    const workflowStatus = await step.run("verify-workflow-active", async () => {
      const supabase = createAdminClient();
      const { data: workflow, error } = await (supabase as any)
        .from('workflows')
        .select('id, status')
        .eq('id', workflowId)
        .single();

      if (error) {
        console.error('Error checking workflow status:', error);
        return null;
      }

      return workflow?.status;
    });

    // If workflow is no longer active, don't execute or reschedule
    if (workflowStatus !== 'active') {
      console.log(
        `[Scheduled Trigger] Workflow ${workflowId} is not active (status: ${workflowStatus}), skipping execution and reschedule`
      );
      // Log cancelled execution
      if (executionLogId) {
        try {
          await logInngestExecutionComplete(executionLogId, 'cancelled', {
            durationMs: Date.now() - startTime,
            stepCount: stepCount,
            errorMessage: `Workflow is not active (status: ${workflowStatus})`,
          });
        } catch (error) {
          console.error('[Monitoring] Failed to log cancelled execution:', error);
        }
      }
      return {
        skipped: true,
        reason: `Workflow is not active (status: ${workflowStatus})`,
        workflowId,
      };
    }

    // Step 3: Trigger the workflow execution
    await step.run("trigger-workflow-execution", async () => {
      stepCount++;
      console.log(`[Scheduled Trigger] Executing workflow ${workflowId} at scheduled time`);
      await inngest.send({
        name: 'workflow/execute',
        data: {
          workflowId: workflowId,
          nodes: nodes,
          edges: edges,
          triggerData: {
            triggerTime: new Date().toISOString(),
            schedule: cronExpression,
            timezone: timezone,
          },
          userId: userId,
          triggerType: 'scheduled',
        },
      });
    });

    // Step 4: Schedule the next occurrence (self-scheduling for efficiency)
    await step.run("schedule-next-run", async () => {
      stepCount++;
      // Double-check workflow is still active before scheduling next run
      const supabase = createAdminClient();
      const { data: workflow } = await (supabase as any)
        .from('workflows')
        .select('status')
        .eq('id', workflowId)
        .single();

      if (workflow?.status === 'active') {
        // Calculate next run time and schedule it
        const { calculateNextRunTime } = await import('@/lib/workflows/schedule-scheduler');
        const nextRun = calculateNextRunTime(cronExpression, timezone);
        
        console.log(
          `[Scheduled Trigger] Scheduling next run for workflow ${workflowId} at ${nextRun.toISOString()}`
        );
        
        // Schedule the next execution using the same efficient method
        await inngest.send({
          name: 'workflow/scheduled-trigger',
          data: {
            workflowId,
            nodes,
            edges,
            userId,
            cronExpression,
            timezone,
            nextRunTime: nextRun.toISOString(), // Pass the next run time
          },
        });
      } else {
        console.log(
          `[Scheduled Trigger] Workflow ${workflowId} is no longer active, not scheduling next run`
        );
      }
    });

      // Log execution completion
      if (executionLogId) {
        try {
          await logInngestExecutionComplete(executionLogId, 'completed', {
            durationMs: Date.now() - startTime,
            stepCount: stepCount,
          });
        } catch (error) {
          console.error('[Monitoring] Failed to log scheduled trigger completion:', error);
        }
      }

      return {
        executed: true,
        workflowId,
        nextRunScheduled: workflowStatus === 'active',
      };
    } catch (error: any) {
      // Log failed execution
      if (executionLogId) {
        try {
          await logInngestExecutionComplete(executionLogId, 'failed', {
            durationMs: Date.now() - startTime,
            stepCount: stepCount,
            errorMessage: error.message || 'Unknown error',
            errorStack: error.stack,
          });
        } catch (monitoringError) {
          console.error('[Monitoring] Failed to log scheduled trigger failure:', monitoringError);
        }
      }
      throw error; // Re-throw to let Inngest handle retries
    }
  },
);

