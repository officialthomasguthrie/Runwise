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
  console.log('📥 POST /api/workflow/execute - Request received');
  
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 User check:', { hasUser: !!user, authError: authError?.message });

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

    // If workflow has a scheduled trigger, return error (scheduled workflows not supported)
    if (hasScheduled && scheduleConfig) {
      console.warn('⚠️ Scheduled workflow detected but not supported:', {
        workflowId: body.workflowId,
        scheduleConfig,
      });
      
      return NextResponse.json({
        success: false,
        error: 'Scheduled workflows are not currently supported',
        message: 'The scheduled workflow executor was temporarily disabled. Please use manual execution instead.',
        status: 'failed',
        scheduled: true,
        scheduleConfig,
      }, { status: 400 });
    }

    // For non-scheduled workflows, execute immediately
    // Create execution record FIRST so frontend can poll for it
    const adminSupabase = createAdminClient();
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('💾 Creating execution record:', { executionId, workflowId: body.workflowId });
    
    const { error: createError } = await (adminSupabase as any)
      .from('workflow_executions')
      .insert({
        id: executionId,
        workflow_id: body.workflowId,
        user_id: user.id,
        status: 'running',
        started_at: new Date().toISOString(),
      });

    if (createError) {
      console.error('❌ Failed to create execution record:', createError);
      return NextResponse.json(
        { error: 'Failed to create execution record', details: createError.message },
        { status: 500 }
      );
    }

    console.log('✅ Execution record created:', executionId);

    // Send workflow execution event to Inngest with the pre-created executionId
    console.log('📤 Sending event to Inngest:', {
      eventName: 'workflow/execute',
      workflowId: body.workflowId,
      executionId,
      nodesCount: body.nodes?.length,
      edgesCount: body.edges?.length,
      userId: user.id,
    });
    
    const eventIds = await inngest.send({
      name: 'workflow/execute',
      data: {
        workflowId: body.workflowId,
        executionId, // Pass the pre-created executionId
        nodes: body.nodes,
        edges: body.edges,
        triggerData: body.triggerData || {},
        userId: user.id,
        triggerType: 'manual',
      },
    });
    
    console.log('✅ Event sent to Inngest, eventIds:', eventIds);

    // Return executionId so frontend can poll immediately
    return NextResponse.json({
      success: true,
      executionId, // Return the executionId so frontend can poll
      eventId: eventIds,
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

