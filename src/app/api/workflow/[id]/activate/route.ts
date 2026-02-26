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
import { assertStepsLimit } from '@/lib/usage';
import { getPlanLimits, subscriptionTierToPlanId } from '@/lib/plans/config';
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
      
      // Get user's subscription tier and map to planId
      const { data: userRow } = await (adminSupabase as any)
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();
      const subscriptionTier = (userRow as any)?.subscription_tier || 'free';
      const planId = subscriptionTierToPlanId(subscriptionTier);
      
      // Check active workflow limit BEFORE activating
      const limits = getPlanLimits(planId);
      if (limits.maxActiveWorkflows != null) {
        // Check if this workflow is already active (don't count it if it is)
        const isCurrentlyActive = workflowRecord.status === 'active';
        
        const { count, error: countErr } = await (adminSupabase as any)
          .from('workflows')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active');
        
        if (countErr) {
          console.error('Error checking active workflows:', countErr);
          return NextResponse.json(
            {
              error: 'Cannot activate workflow',
              message: 'Failed to validate active workflows limit',
            },
            { status: 500 }
          );
        }
        
        const activeCount = count || 0;
        // If this workflow is already active, don't count it
        const countToCheck = isCurrentlyActive ? activeCount - 1 : activeCount;
        
        if (countToCheck >= limits.maxActiveWorkflows) {
          return NextResponse.json(
            {
              error: 'Cannot activate workflow',
              message: `Plan limit reached: Up to ${limits.maxActiveWorkflows} active workflows on your plan.`,
            },
            { status: 403 }
          );
        }
      }
      
      // Check step limit based on user's plan
      // Count nodes in workflow (excluding placeholder nodes)
      const nodeCount = nodes.filter((node: any) => 
        node.type !== 'placeholder' && node.data?.nodeId !== 'placeholder'
      ).length;
      
      try {
        assertStepsLimit(planId, nodeCount);
      } catch (limitError: any) {
        return NextResponse.json(
          {
            error: 'Cannot activate workflow',
            message: limitError.message,
          },
          { status: 403 }
        );
      }
      
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
      
      console.log(`[Activation] Workflow ${workflowId} - Checking triggers...`);
      console.log(`[Activation] Nodes:`, nodes.map(n => ({ id: n.id, nodeId: n.data?.nodeId, type: n.type })));
      
      // Check for scheduled trigger and schedule initial execution
      const hasScheduled = hasScheduledTrigger(nodes);
      console.log(`[Activation] Has scheduled trigger: ${hasScheduled}`);
      
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
              `[Activation] Workflow ${workflowId} activated with scheduled trigger, next run: ${nextRunTime.toISOString()}`
            );
          } else {
            console.warn(`[Activation] Workflow ${workflowId} has scheduled trigger but no next run time calculated`);
          }
        } catch (error: any) {
          console.error(`[Activation] Failed to schedule workflow ${workflowId}:`, error);
          // Don't fail the activation if scheduling fails - log and continue
        }
      }

      // Check for webhook trigger
      const hasWebhook = nodes.some(node => node.data?.nodeId === 'webhook-trigger');
      console.log(`[Activation] Has webhook trigger: ${hasWebhook}`);
      
      if (hasWebhook) {
        // Webhook triggers are handled by dynamic routes
        // No need to register here - webhook routes will check active workflows
        console.log(`[Activation] Workflow ${workflowId} activated with webhook trigger`);
      }

      // Check for polling triggers (handled by Cloudflare Worker)
      const pollingTriggerTypes = [
        'new-form-submission',
        'new-email-received',
        'new-message-in-slack',
        'new-row-in-google-sheet',
        'new-github-issue',
        'file-uploaded',
      ];
      const hasPollingTrigger = nodes.some(node => {
        const nodeId = node.data?.nodeId;
        return typeof nodeId === 'string' && pollingTriggerTypes.includes(nodeId);
      });
      console.log(`[Activation] Has polling trigger: ${hasPollingTrigger}`);
      
      if (hasPollingTrigger && active) {
        // Create polling trigger entry in database for Cloudflare Worker
        try {
          const { createPollingTrigger, getPollingTriggerFromNodes } = await import('@/lib/workflows/polling-triggers');
          const triggerInfo = getPollingTriggerFromNodes(nodes);
          
          if (triggerInfo) {
            await createPollingTrigger(
              workflowId,
              triggerInfo.triggerType,
              triggerInfo.config
            );
            console.log(
              `[Activation] Created polling trigger for workflow ${workflowId}, type ${triggerInfo.triggerType}`
            );
          }
        } catch (error: any) {
          console.error(`[Activation] Failed to create polling trigger for workflow ${workflowId}:`, error);
          // Don't fail activation if polling trigger creation fails
        }
        
        console.log(`[Activation] Workflow ${workflowId} activated with polling trigger - will be handled by Cloudflare Worker`);
      } else if (hasPollingTrigger && !active) {
        // Disable polling trigger when workflow is deactivated
        try {
          const { disablePollingTrigger, getPollingTriggerFromNodes } = await import('@/lib/workflows/polling-triggers');
          const triggerInfo = getPollingTriggerFromNodes(nodes);
          
          if (triggerInfo) {
            await disablePollingTrigger(workflowId, triggerInfo.triggerType);
            console.log(`[Activation] Disabled polling trigger for workflow ${workflowId}`);
          }
        } catch (error: any) {
          console.error(`[Activation] Failed to disable polling trigger for workflow ${workflowId}:`, error);
        }
      }

      // Log if no trigger found
      if (!hasScheduled && !hasWebhook && !hasPollingTrigger) {
        console.warn(`[Activation] Workflow ${workflowId} activated but no recognized trigger found. Nodes:`, nodes.map(n => n.data?.nodeId));
      }
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

