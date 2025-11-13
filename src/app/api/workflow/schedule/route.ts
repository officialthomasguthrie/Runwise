/**
 * API Route: /api/workflow/schedule
 * Enables or disables scheduled execution for a workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
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

    const body = await request.json();
    const { workflowId, enabled } = body;

    if (!workflowId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: workflowId and enabled are required' },
        { status: 400 }
      );
    }

    // Get the workflow
    const adminSupabase = createAdminClient() as any;
    const { data: workflow, error: workflowError } = await adminSupabase
      .from('workflows')
      .select('id, workflow_data, user_id, status')
      .eq('id', workflowId)
      .eq('user_id', user.id)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflowRecord = workflow as any;

    // Check if workflow has a scheduled trigger
    if (!workflowRecord.workflow_data?.nodes) {
      return NextResponse.json(
        { error: 'Workflow has no nodes' },
        { status: 400 }
      );
    }

    const hasScheduled = hasScheduledTrigger(workflowRecord.workflow_data.nodes);

    if (!hasScheduled) {
      return NextResponse.json(
        { error: 'Workflow does not have a scheduled trigger' },
        { status: 400 }
      );
    }

    // Update workflow status
    const newStatus = enabled ? 'active' : 'paused';
    const { error: updateError } = await adminSupabase
      .from('workflows')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflowId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update workflow status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: enabled 
        ? 'Scheduled execution enabled. Workflow will run according to its schedule.' 
        : 'Scheduled execution disabled.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/workflow/schedule:', error);
    return NextResponse.json(
      {
        error: 'Failed to update schedule',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if a workflow is scheduled
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Missing workflowId parameter' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient() as any;
    const { data: workflow, error: workflowError } = await adminSupabase
      .from('workflows')
      .select('id, workflow_data, status')
      .eq('id', workflowId)
      .eq('user_id', user.id)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflowRecord = workflow as any;

    const hasScheduled = workflowRecord.workflow_data?.nodes 
      ? hasScheduledTrigger(workflowRecord.workflow_data.nodes)
      : false;
    
    const scheduleConfig = workflowRecord.workflow_data?.nodes
      ? getScheduleConfig(workflowRecord.workflow_data.nodes)
      : null;

    return NextResponse.json({
      hasScheduledTrigger: hasScheduled,
      scheduleConfig,
      isActive: workflowRecord.status === 'active',
      status: workflowRecord.status,
    });
  } catch (error: any) {
    console.error('Error in GET /api/workflow/schedule:', error);
    return NextResponse.json(
      {
        error: 'Failed to get schedule status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}



