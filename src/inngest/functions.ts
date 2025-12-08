import { inngest } from "./client";
import { executeWorkflow } from "@/lib/workflow-execution/executor";
import { createAdminClient } from "@/lib/supabase-admin";
import type { Database } from "@/types/database";
import type { Node, Edge } from "@xyflow/react";
import { assertWithinLimit, incrementUsage } from "@/lib/usage";
import { getPlanLimits } from "@/lib/plans/config";
import { hasScheduledTrigger, getScheduleConfig } from "@/lib/workflows/schedule-utils";
// @ts-ignore - cron-parser has incorrect type definitions
import parseExpression from "cron-parser";
import { scheduleNextWorkflowRun } from "@/lib/workflows/schedule-scheduler";

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
    const { workflowId, nodes, edges, triggerData, userId, triggerType = 'manual' } = event.data;

    // Validate input
    if (!workflowId || !nodes || !Array.isArray(nodes) || !edges || !Array.isArray(edges)) {
      throw new Error("Invalid workflow execution request: missing required fields");
    }

    // Step 0.5: Check if workflow is active (skip for manual/test executions)
    if (triggerType !== 'manual' && triggerType !== 'test') {
      const workflowStatus = await step.run("check-workflow-status", async () => {
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
        return {
          skipped: true,
          reason: `Workflow is not active (status: ${workflowStatus})`,
          workflowId,
        };
      }
    }

    // Step 0: Fetch user's plan and check limits
    const planCheck = await step.run("check-plan-and-limits", async () => {
      try {
        const supabaseForPlan = createAdminClient();
        const { data: userRow, error: userError } = await supabaseForPlan
          .from("users")
          .select("id, plan_id")
          .eq("id", userId)
          .single();
        
        if (userError) {
          console.error('Error fetching user plan:', userError);
          // Default to personal plan if user lookup fails
          return { planId: "personal" };
        }
        
        const planId = (userRow as any)?.plan_id ?? "personal";

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
  async ({ event, step }) => {
    const {
      workflowId,
      nodes,
      edges,
      userId,
      cronExpression,
      timezone,
    } = event.data;

    // Step 1: Verify workflow is still active before executing
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
        `Workflow ${workflowId} is not active (status: ${workflowStatus}), skipping execution and reschedule`
      );
      return {
        skipped: true,
        reason: `Workflow is not active (status: ${workflowStatus})`,
        workflowId,
      };
    }

    // Step 2: Trigger the workflow execution
    await step.run("trigger-workflow-execution", async () => {
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

    // Step 3: Schedule the next occurrence
    await step.run("schedule-next-run", async () => {
      // Double-check workflow is still active before scheduling next run
      const supabase = createAdminClient();
      const { data: workflow } = await (supabase as any)
        .from('workflows')
        .select('status')
        .eq('id', workflowId)
        .single();

      if (workflow?.status === 'active') {
        await scheduleNextWorkflowRun({
          workflowId,
          nodes,
          edges,
          userId,
          cronExpression,
          timezone,
        });
      } else {
        console.log(
          `Workflow ${workflowId} is no longer active, not scheduling next run`
        );
      }
    });

    return {
      executed: true,
      workflowId,
      nextRunScheduled: workflowStatus === 'active',
    };
  },
);

// ============================================================================
// POLLING WORKFLOW TRIGGER
// ============================================================================

/**
 * Polling Workflow Trigger Function
 * Runs every 5 minutes to check for active workflows with polling triggers
 * (form submissions, emails, Slack messages, sheet rows, etc.)
 * and triggers them when new data is found
 */
export const pollingWorkflowTrigger = inngest.createFunction(
  {
    id: "polling-workflow-trigger",
    name: "Polling Workflow Trigger",
  },
  { cron: "*/5 * * * *" }, // Run every 5 minutes
  async ({ step }) => {
    // Step 1: Fetch all active workflows with polling triggers
    const activeWorkflows = await step.run("fetch-active-polling-workflows", async () => {
      const supabase = createAdminClient();
      
      // Get all active workflows
      const { data: workflows, error } = await (supabase as any)
        .from('workflows')
        .select('id, workflow_data, user_id, name')
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching active workflows for polling:', error);
        return [];
      }

      if (!workflows || workflows.length === 0) {
        return [];
      }

      // Filter workflows that have polling triggers
      // Polling triggers are those that need to check external APIs periodically
      const pollingTriggerTypes = [
        'new-form-submission',
        'new-email-received',
        'new-message-in-slack',
        'new-row-in-google-sheet',
        'new-github-issue',
        'file-uploaded',
      ];

      const pollingWorkflows = workflows.filter((workflow: any) => {
        if (!workflow.workflow_data?.nodes) return false;
        
        const nodes = workflow.workflow_data.nodes as Node[];
        return nodes.some(node => {
          const nodeId = node.data?.nodeId;
          return typeof nodeId === 'string' && pollingTriggerTypes.includes(nodeId);
        });
      });

      return pollingWorkflows;
    });

    if (activeWorkflows.length === 0) {
      return { triggered: 0, message: 'No active polling workflows found' };
    }

    // Step 2: Poll each workflow's trigger and trigger if new data found
    const triggeredWorkflows: string[] = [];

    for (const workflow of activeWorkflows) {
      await step.run(`poll-and-trigger-${workflow.id}`, async () => {
        const nodes = workflow.workflow_data.nodes as Node[];
        const edges = workflow.workflow_data.edges || [];
        
        // Find the polling trigger node
        const pollingTriggerTypes = [
          'new-form-submission',
          'new-email-received',
          'new-message-in-slack',
          'new-row-in-google-sheet',
          'new-github-issue',
          'file-uploaded',
        ];
        
        const triggerNode = nodes.find(node => {
          const nodeId = node.data?.nodeId;
          return typeof nodeId === 'string' && pollingTriggerTypes.includes(nodeId);
        });

        if (!triggerNode) {
          return { triggered: false, reason: 'No polling trigger found' };
        }

        const triggerType = triggerNode.data?.nodeId;
        const config = triggerNode.data?.config || {};

        // For now, we'll trigger the workflow execution
        // The actual polling logic is handled in the node's execute function
        // which will check for new data and return it
        // This is a simplified approach - in production, you'd want to:
        // 1. Check last poll time from database
        // 2. Poll the external API
        // 3. Compare with previous data
        // 4. Only trigger if new data is found

        // Trigger the workflow - the executor will handle the polling logic
        await inngest.send({
          name: 'workflow/execute',
          data: {
            workflowId: workflow.id,
            nodes: nodes,
            edges: edges,
            triggerData: {
              triggerType: triggerType,
              polledAt: new Date().toISOString(),
            },
            userId: workflow.user_id,
            triggerType: 'polling',
          },
        });

        triggeredWorkflows.push(workflow.id);
        return { triggered: true, workflowId: workflow.id, triggerType };
      });
    }

    return {
      triggered: triggeredWorkflows.length,
      workflowIds: triggeredWorkflows,
      message: `Polled and triggered ${triggeredWorkflows.length} workflow(s)`,
    };
  },
);

