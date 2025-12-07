/**
 * API Route: /api/workflow/[id]/activate
 * Activates or deactivates a workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { hasScheduledTrigger, getScheduleConfig } from '@/lib/workflows/schedule-utils';
import { scheduleWorkflowOnActivation } from '@/lib/workflows/schedule-scheduler';
import { validateWorkflowConfiguration } from '@/lib/workflows/validation';
import type { Node } from '@xyflow/react';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: workflowId } = await params;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { active } = body;

    if (typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required field: active (boolean)' },
        { status: 400 }
      );
    }

    // Get the workflow
    const adminSupabase = createAdminClient();
    const { data: workflow, error: workflowError } = await (adminSupabase as any)
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
    
    // If activating, validate that all required configurations are set
    if (active && workflowRecord.workflow_data?.nodes) {
      const nodes = workflowRecord.workflow_data.nodes as Node[];
      const validation = validateWorkflowConfiguration(nodes);
      
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: 'Cannot activate workflow',
            message: validation.message,
            unconfiguredNodes: validation.unconfiguredNodes,
          },
          { status: 400 }
        );
      }
    }
    
    // Database schema uses 'draft', 'active', 'paused', 'archived'
    // Use 'paused' for inactive instead of 'inactive'
    const newStatus = active ? 'active' : 'paused';

    // Update workflow status
    const { error: updateError } = await (adminSupabase as any)
      .from('workflows')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflowId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating workflow status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update workflow status' },
        { status: 500 }
      );
    }

    // If activating, check for triggers and register them
    if (active && workflowRecord.workflow_data?.nodes) {
      const nodes = workflowRecord.workflow_data.nodes as Node[];
      const edges = workflowRecord.workflow_data.edges || [];
      
      // Check for scheduled trigger and schedule initial execution
      const hasScheduled = hasScheduledTrigger(nodes);
      if (hasScheduled) {
        try {
          const nextRunTime = await scheduleWorkflowOnActivation(
            workflowId,
            nodes,
            edges,
            user.id
          );
          
          if (nextRunTime) {
            console.log(
              `Workflow ${workflowId} activated with scheduled trigger, next run: ${nextRunTime.toISOString()}`
            );
          }
        } catch (error: any) {
          console.error(`Failed to schedule workflow ${workflowId}:`, error);
          // Don't fail the activation if scheduling fails - log and continue
        }
      }

      // Check for webhook trigger
      const hasWebhook = nodes.some(node => node.data?.nodeId === 'webhook-trigger');
      if (hasWebhook) {
        // Webhook triggers are handled by dynamic routes
        // No need to register here - webhook routes will check active workflows
        console.log(`Workflow ${workflowId} activated with webhook trigger`);
      }

      // Other trigger types (polling) are handled by Inngest polling function
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: active 
        ? 'Workflow activated. It will execute when triggers are triggered.' 
        : 'Workflow deactivated.',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/workflow/[id]/activate:', error);
    return NextResponse.json(
      {
        error: 'Failed to update workflow activation status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check workflow activation status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: workflowId } = await params;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the workflow
    const adminSupabase = createAdminClient();
    const { data: workflow, error: workflowError } = await (adminSupabase as any)
      .from('workflows')
      .select('id, status')
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
    const isActive = workflowRecord.status === 'active';

    return NextResponse.json({
      active: isActive,
      status: workflowRecord.status,
    });
  } catch (error: any) {
    console.error('Error in GET /api/workflow/[id]/activate:', error);
    return NextResponse.json(
      {
        error: 'Failed to get workflow activation status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

