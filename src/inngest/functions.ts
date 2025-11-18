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
 */
export const scheduledWorkflowExecutor = inngest.createFunction(
  {
    id: "scheduled-workflow-executor",
    retries: 1,
  },
  {
    cron: "*/1 * * * *", // Run every minute
  },
  async ({ step }) => {
    // Step 1: Find all active workflows with scheduled triggers
    type ScheduledWorkflowRow = Pick<
      Database['public']['Tables']['workflows']['Row'],
      'id' | 'workflow_data' | 'user_id' | 'status'
    >;

    const activeScheduledWorkflows = await step.run("find-scheduled-workflows", async () => {
      const supabase = createAdminClient();
      
      // Get all active workflows
      const { data: workflows, error } = await supabase
        .from('workflows')
        .select('id, workflow_data, user_id, status')
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching active workflows:', error);
        return [];
      }

      if (!workflows) return [];

      const typedWorkflows = workflows as ScheduledWorkflowRow[];

      // Filter workflows that have scheduled triggers
      const scheduledWorkflows = typedWorkflows.filter((workflow) => {
        if (!workflow.workflow_data?.nodes) return false;
        
        return workflow.workflow_data.nodes.some(
          (node: any) => node.type === 'scheduled-time-trigger'
        );
      });

      return scheduledWorkflows;
    });

    // Step 2: For each scheduled workflow, check if it should run now
    for (const workflow of activeScheduledWorkflows) {
      await step.run(`check-schedule-${workflow.id}`, async () => {
        if (!workflow.workflow_data?.nodes) return;

        // Find the scheduled trigger node
        const scheduledTrigger = workflow.workflow_data.nodes.find(
          (node: any) => node.type === 'scheduled-time-trigger'
        );

        if (!scheduledTrigger?.data?.config?.schedule) return;

        const cronExpression = scheduledTrigger.data.config.schedule;
        const timezone = scheduledTrigger.data.config.timezone || 'UTC';

        // Check if current time matches the cron schedule
        // This is a simplified check - in production, use a proper cron parser
        if (shouldRunNow(cronExpression, timezone)) {
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
        }
      });
    }
  },
);

/**
 * Simplified cron check - determines if a cron expression should run now
 * Note: This is a basic implementation. For production, consider using a library like node-cron
 */
function shouldRunNow(cronExpression: string, timezone: string): boolean {
  const now = new Date();
  
  // Parse cron expression (minute hour day month day-of-week)
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const [minute, hour, day, month, dayOfWeek] = parts;

  // Check if current time matches
  const matches = (value: string, current: number, max: number): boolean => {
    if (value === '*') return true;
    if (value.includes('/')) {
      const [range, step] = value.split('/');
      const rangeStart = range === '*' ? 0 : parseInt(range);
      return current >= rangeStart && (current - rangeStart) % parseInt(step) === 0;
    }
    if (value.includes('-')) {
      const [start, end] = value.split('-').map(Number);
      return current >= start && current <= end;
    }
    if (value.includes(',')) {
      return value.split(',').map(Number).includes(current);
    }
    return parseInt(value) === current;
  };

  // Note: This is a simplified check. For production, use a proper cron parser
  // that handles all cron syntax properly
  const currentMinute = now.getUTCMinutes();
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDate();
  const currentMonth = now.getUTCMonth() + 1; // JavaScript months are 0-indexed
  const currentDayOfWeek = now.getUTCDay();

  return (
    matches(minute, currentMinute, 59) &&
    matches(hour, currentHour, 23) &&
    matches(day, currentDay, 31) &&
    matches(month, currentMonth, 12) &&
    matches(dayOfWeek, currentDayOfWeek, 6)
  );
}
