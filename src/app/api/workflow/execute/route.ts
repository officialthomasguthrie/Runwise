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

    // If workflow has a scheduled trigger, enable scheduled execution instead of running immediately
    if (hasScheduled && scheduleConfig && !body.testMode) {
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
        triggerType: body.testMode ? 'test' : 'manual',
        testMode: body.testMode ?? false,
      },
    });

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

