/**
 * API Route: /api/workflow/execute
 * Sends workflow execution request to Inngest for async processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { inngest } from '@/inngest/client';
import type { ExecuteWorkflowRequest } from '@/lib/workflow-execution/types';
import { hasScheduledTrigger, getScheduleConfig } from '@/lib/workflows/schedule-utils';

export async function POST(request: NextRequest) {
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

    // Enforce subscription requirement for workflow execution
    try {
      const { data: userRow, error: userError } = await (supabase as any)
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      const subscriptionTier = userError
        ? 'free'
        : ((userRow as any)?.subscription_tier || 'free');

      if (subscriptionTier === 'free') {
        // Check if free user has token-holder credits to bypass the subscription gate.
        // Any positive balance (even below the worst-case cap) allows through —
        // the actual cost is calculated post-execution in Inngest.
        const EXECUTION_CREDIT_CAP = parseInt(process.env.EXECUTION_CREDIT_CAP ?? '25');
        const adminForCredits = createAdminClient();
        const { data: creditsRow } = await (adminForCredits as any)
          .from('users')
          .select('credits_balance')
          .eq('id', user.id)
          .single();

        const creditsBalance: number = (creditsRow as any)?.credits_balance ?? 0;

        if (creditsBalance <= 0) {
          // No credits — enforce subscription gate as before
          const { count, error: countError } = await supabase
            .from('workflows')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('ai_generated', true);

          if (!countError && count && count >= 1) {
            return NextResponse.json(
              {
                error: 'You have reached your free limit. Upgrade to continue.',
                requiresSubscription: true,
              },
              { status: 402 }
            );
          }

          return NextResponse.json(
            {
              error: 'Subscription required to execute workflows',
              requiresSubscription: true,
            },
            { status: 402 }
          );
        }

        // credits_balance > 0: token-holder credits allow execution.
        // Log for observability — worst-case reserve check is informational only here.
        console.log(
          `[workflow/execute] Free user ${user.id} bypassing gate via token credits ` +
          `(balance=${creditsBalance}, cap=${EXECUTION_CREDIT_CAP})`
        );
      }
    } catch (subError) {
      console.error('Error checking subscription tier in /api/workflow/execute:', subError);
      return NextResponse.json(
        {
          error: 'Subscription required to execute workflows',
          requiresSubscription: true,
        },
        { status: 402 }
      );
    }

    // Parse request body
    const body: ExecuteWorkflowRequest = await request.json();

    // Validate required fields
    if (!body.workflowId || !body.nodes || !Array.isArray(body.nodes)) {
      return NextResponse.json(
        { error: 'Missing required fields: workflowId and nodes are required' },
        { status: 400 }
      );
    }

    if (!body.edges || !Array.isArray(body.edges)) {
      return NextResponse.json(
        { error: 'Missing required field: edges is required' },
        { status: 400 }
      );
    }

    // Check if workflow has a scheduled trigger
    const hasScheduled = hasScheduledTrigger(body.nodes);
    const scheduleConfig = getScheduleConfig(body.nodes);
    const isTest = (body as any).isTest === true;

    // If workflow has a scheduled trigger AND it's not a test execution, enable scheduled execution instead of running immediately
    // For test executions, always execute immediately regardless of trigger type
    if (hasScheduled && scheduleConfig && !isTest) {
      // Update workflow status to 'active' to enable scheduled execution
      const adminSupabase = createAdminClient();
      const { error: updateError } = await (adminSupabase as any)
        .from('workflows')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.workflowId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating workflow status:', updateError);
      }

      return NextResponse.json({
        success: true,
        message: `Scheduled execution enabled. Workflow will run according to schedule: ${scheduleConfig.cron}`,
        status: 'scheduled',
        scheduleConfig,
        scheduled: true,
      });
    }

    // For non-scheduled workflows, execute immediately
    // Send workflow execution event to Inngest
    const eventIds = await inngest.send({
      name: 'workflow/execute',
      data: {
        workflowId: body.workflowId,
        nodes: body.nodes,
        edges: body.edges,
        triggerData: body.triggerData || {},
        userId: user.id,
        triggerType: (body as any).isTest ? 'test' : 'manual',
      },
    });

    // Credit deduction happens post-execution in Inngest workflowExecutor — see src/inngest/functions.ts

    // Return event ID for tracking
    // The actual execution happens asynchronously in Inngest
    const sendResult: any = eventIds;
    const normalizedEventId =
      sendResult?.[0]?.ids?.[0] ??
      sendResult?.[0] ??
      sendResult?.ids?.[0] ??
      sendResult;

    return NextResponse.json({
      success: true,
      eventId: normalizedEventId,
      message: 'Workflow execution queued',
      status: 'queued',
      scheduled: false,
    });
  } catch (error: any) {
    console.error('Error in POST /api/workflow/execute:', error);
    return NextResponse.json(
      {
        error: 'Failed to queue workflow execution',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

