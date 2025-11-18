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
    const { workflowId, nodes, edges, triggerData, userId, triggerType } = event.data;

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
        // Skip trigger nodes for manual/test executions (when user clicks "Test Workflow")
        const skipTriggers = triggerType === 'manual';
        
        console.log('🚀 Starting workflow execution:', {
          workflowId,
          nodesCount: nodes.length,
          edgesCount: edges.length,
          skipTriggers,
          triggerType,
        });
        
        const result = await executeWorkflow(
          workflowId,
          nodes as Node[],
          edges as Edge[],
          triggerData || {},
          userId,
          skipTriggers
        );
        
        console.log('✅ Workflow execution completed:', {
          executionId: result.executionId,
          status: result.status,
          nodeResultsCount: result.nodeResults?.length,
        });
        
        // Override the executionId to match our database record
        result.executionId = executionRecord.executionId;
        
        return result;
      } catch (error: any) {
        console.error('❌ Workflow execution failed:', {
          error: error.message,
          stack: error.stack,
          workflowId,
          executionId: executionRecord.executionId,
        });
        
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

        // Return a failed result so the frontend can see the error
        // Don't re-throw - let the result be saved and returned
        const failedResult = {
          executionId: executionRecord.executionId,
          workflowId,
          status: 'failed' as const,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 0,
          nodeResults: [],
          finalOutput: null,
          error: error.message || 'Unknown error',
        };
        
        return failedResult;
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
        const nodeResultsData = executionResult.nodeResults
          .filter((nodeResult) => nodeResult !== null && nodeResult !== undefined)
          .map((nodeResult) => ({
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
        const allLogs = executionResult.nodeResults
          .filter((nodeResult) => nodeResult !== null && nodeResult !== undefined)
          .flatMap((nodeResult) => {
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
 * REMOVED: Scheduled Workflow Executor
 * 
 * This function was removed because it was causing infinite retry loops.
 * The cron trigger running every minute was causing 1000+ failed executions.
 * 
 * If you need scheduled workflows in the future, rebuild this function with:
 * 1. Better error handling (never throw errors)
 * 2. Proper cron parsing (use a library like node-cron)
 * 3. Rate limiting and safeguards
 * 4. Better logging and monitoring
 * 
 * For now, scheduled workflows are not supported.
 */
