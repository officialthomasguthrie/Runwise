import { inngest } from "./client";
import { executeWorkflow } from "@/lib/workflow-execution/executor";
import { createAdminClient } from "@/lib/supabase-admin";
import type { Database } from "@/types/database";
import type { Node, Edge } from "@xyflow/react";
import { assertWithinLimit, incrementUsage } from "@/lib/usage";
import { getPlanLimits } from "@/lib/plans/config";

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
  async ({ event, step }) => {
    const { workflowId, nodes, edges, triggerData, userId } = event.data;

    // Validate input
    if (!workflowId || !nodes || !Array.isArray(nodes) || !edges || !Array.isArray(edges)) {
      throw new Error("Invalid workflow execution request: missing required fields");
    }

    // Fetch user's plan
    const supabaseForPlan = createAdminClient();
    const { data: userRow } = await supabaseForPlan
      .from("users")
      .select("id, plan_id")
      .eq("id", userId)
      .single();
    const planId = (userRow as any)?.plan_id ?? "personal";

    // Enforce executions limit (pre-check)
    await assertWithinLimit(userId, planId, "executions");

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
          started_at: new Date().toISOString(),
        });

      if (error) {
        throw new Error(`Failed to create execution record: ${error.message}`);
      }

      return { executionId };
    });

    // Step 2: Execute the workflow (with executionId pre-determined)
    const executionResult = await step.run("execute-workflow", async () => {
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
      await incrementUsage(userId, "executions", 1, {
        workflowId,
        executionId: executionResult.executionId,
      });
    });

    return {
      executionId: executionResult.executionId,
      status: executionResult.status,
      duration: executionResult.duration,
      nodeCount: executionResult.nodeResults.length,
    };
  },
);

// ============================================================================
// SCHEDULED WORKFLOW EXECUTOR
// ============================================================================

/**
 * Scheduled Workflow Executor
 * Automatically executes workflows that have scheduled triggers
 * This function runs every minute to check for scheduled workflows
 * 
 * IMPORTANT: This function must never throw errors to prevent retry loops.
 * All errors are caught and logged, but the function always completes successfully.
 */
/**
 * TEMPORARILY DISABLED: Uncomment the cron trigger below to re-enable scheduled workflows
 * The function is kept here but won't run until the cron trigger is uncommented
 */
export const scheduledWorkflowExecutor = inngest.createFunction(
  {
    id: "scheduled-workflow-executor",
    retries: 0, // Disable retries to prevent infinite loops
  },
  // TEMPORARILY DISABLED - Uncomment below to re-enable
  // {
  //   cron: "*/1 * * * *", // Run every minute
  // },
  // Using a manual event trigger instead so it only runs when explicitly called
  { event: "scheduled-workflow/check" },
  async ({ step }) => {
    try {
      // Step 1: Find all active workflows with scheduled triggers
      type ScheduledWorkflowRow = Pick<
        Database['public']['Tables']['workflows']['Row'],
        'id' | 'workflow_data' | 'user_id' | 'status'
      >;

      const activeScheduledWorkflows = await step.run("find-scheduled-workflows", async () => {
        try {
          const supabase = createAdminClient();
          
          // Get all active workflows
          const { data: workflows, error } = await supabase
            .from('workflows')
            .select('id, workflow_data, user_id, status')
            .eq('status', 'active');

          if (error) {
            console.error('[scheduled-workflow-executor] Error fetching active workflows:', error);
            return [];
          }

          if (!workflows || workflows.length === 0) {
            console.log('[scheduled-workflow-executor] No active workflows found');
            return [];
          }

          const typedWorkflows = workflows as ScheduledWorkflowRow[];

          // Filter workflows that have scheduled triggers
          const scheduledWorkflows = typedWorkflows.filter((workflow) => {
            try {
              if (!workflow.workflow_data?.nodes) return false;
              
              return workflow.workflow_data.nodes.some(
                (node: any) => node.type === 'scheduled-time-trigger'
              );
            } catch (err) {
              console.error(`[scheduled-workflow-executor] Error filtering workflow ${workflow.id}:`, err);
              return false;
            }
          });

          console.log(`[scheduled-workflow-executor] Found ${scheduledWorkflows.length} scheduled workflows`);
          return scheduledWorkflows;
        } catch (err: any) {
          console.error('[scheduled-workflow-executor] Error in find-scheduled-workflows step:', err);
          return [];
        }
      });

      // Step 2: For each scheduled workflow, check if it should run now
      if (!activeScheduledWorkflows || activeScheduledWorkflows.length === 0) {
        console.log('[scheduled-workflow-executor] No scheduled workflows to process');
        return { processed: 0, triggered: 0 };
      }

      let processed = 0;
      let triggered = 0;

      for (const workflow of activeScheduledWorkflows) {
        try {
          await step.run(`check-schedule-${workflow.id}`, async () => {
            try {
              if (!workflow.workflow_data?.nodes) {
                console.log(`[scheduled-workflow-executor] Workflow ${workflow.id} has no nodes, skipping`);
                return;
              }

              // Find the scheduled trigger node
              const scheduledTrigger = workflow.workflow_data.nodes.find(
                (node: any) => node.type === 'scheduled-time-trigger'
              );

              if (!scheduledTrigger?.data?.config?.schedule) {
                console.log(`[scheduled-workflow-executor] Workflow ${workflow.id} has no schedule config, skipping`);
                return;
              }

              const cronExpression = scheduledTrigger.data.config.schedule;
              const timezone = scheduledTrigger.data.config.timezone || 'UTC';

              // Validate cron expression before checking
              if (!cronExpression || typeof cronExpression !== 'string') {
                console.error(`[scheduled-workflow-executor] Invalid cron expression for workflow ${workflow.id}:`, cronExpression);
                return;
              }

              // Check if current time matches the cron schedule
              let shouldRun = false;
              try {
                shouldRun = shouldRunNow(cronExpression, timezone);
              } catch (cronError: any) {
                console.error(`[scheduled-workflow-executor] Error checking cron for workflow ${workflow.id}:`, cronError);
                return;
              }

              if (shouldRun) {
                try {
                  // Trigger the workflow execution
                  await inngest.send({
                    name: 'workflow/execute',
                    data: {
                      workflowId: workflow.id,
                      nodes: workflow.workflow_data.nodes,
                      edges: workflow.workflow_data.edges || [],
                      triggerData: {
                        scheduled: true,
                        triggerTime: new Date().toISOString(),
                        schedule: cronExpression,
                        timezone,
                      },
                      userId: workflow.user_id,
                      triggerType: 'scheduled',
                    },
                  });
                  triggered++;
                  console.log(`[scheduled-workflow-executor] Triggered workflow ${workflow.id} with schedule ${cronExpression}`);
                } catch (sendError: any) {
                  console.error(`[scheduled-workflow-executor] Error sending workflow execution event for ${workflow.id}:`, sendError);
                  // Don't throw - continue processing other workflows
                }
              }
              processed++;
            } catch (workflowError: any) {
              console.error(`[scheduled-workflow-executor] Error processing workflow ${workflow.id}:`, workflowError);
              // Don't throw - continue processing other workflows
            }
          });
        } catch (stepError: any) {
          console.error(`[scheduled-workflow-executor] Error in step for workflow ${workflow.id}:`, stepError);
          // Don't throw - continue processing other workflows
        }
      }

      console.log(`[scheduled-workflow-executor] Completed: processed ${processed}, triggered ${triggered}`);
      return { processed, triggered };
    } catch (error: any) {
      // CRITICAL: Never throw errors from this function to prevent retry loops
      console.error('[scheduled-workflow-executor] Fatal error (caught to prevent retries):', error);
      return { processed: 0, triggered: 0, error: error.message };
    }
  },
);

/**
 * Simplified cron check - determines if a cron expression should run now
 * Note: This is a basic implementation. For production, consider using a library like node-cron
 * 
 * IMPORTANT: This function must never throw errors. All errors are caught and return false.
 */
function shouldRunNow(cronExpression: string, timezone: string): boolean {
  try {
    if (!cronExpression || typeof cronExpression !== 'string') {
      console.error('[shouldRunNow] Invalid cron expression:', cronExpression);
      return false;
    }

    const now = new Date();
    
    // Parse cron expression (minute hour day month day-of-week)
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length < 5) {
      console.error('[shouldRunNow] Invalid cron format (need 5 parts):', cronExpression);
      return false;
    }

    const [minute, hour, day, month, dayOfWeek] = parts;

    // Check if current time matches
    const matches = (value: string, current: number, max: number): boolean => {
      try {
        if (!value || typeof value !== 'string') return false;
        if (value === '*') return true;
        
        if (value.includes('/')) {
          const parts = value.split('/');
          if (parts.length !== 2) return false;
          const [range, stepStr] = parts;
          const step = parseInt(stepStr);
          if (isNaN(step) || step <= 0) return false;
          const rangeStart = range === '*' ? 0 : parseInt(range);
          if (isNaN(rangeStart)) return false;
          return current >= rangeStart && (current - rangeStart) % step === 0;
        }
        
        if (value.includes('-')) {
          const parts = value.split('-');
          if (parts.length !== 2) return false;
          const [start, end] = parts.map(Number);
          if (isNaN(start) || isNaN(end)) return false;
          return current >= start && current <= end;
        }
        
        if (value.includes(',')) {
          const values = value.split(',').map(Number);
          if (values.some(v => isNaN(v))) return false;
          return values.includes(current);
        }
        
        const numValue = parseInt(value);
        if (isNaN(numValue)) return false;
        return numValue === current;
      } catch (err) {
        console.error('[shouldRunNow] Error in matches function:', err, 'value:', value);
        return false;
      }
    };

    // Note: This is a simplified check. For production, use a proper cron parser
    // that handles all cron syntax properly
    const currentMinute = now.getUTCMinutes();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDate();
    const currentMonth = now.getUTCMonth() + 1; // JavaScript months are 0-indexed
    const currentDayOfWeek = now.getUTCDay();

    const result = (
      matches(minute, currentMinute, 59) &&
      matches(hour, currentHour, 23) &&
      matches(day, currentDay, 31) &&
      matches(month, currentMonth, 12) &&
      matches(dayOfWeek, currentDayOfWeek, 6)
    );

    return result;
  } catch (error: any) {
    // CRITICAL: Never throw errors from this function
    console.error('[shouldRunNow] Fatal error (caught to prevent crashes):', error, 'cronExpression:', cronExpression);
    return false;
  }
}
