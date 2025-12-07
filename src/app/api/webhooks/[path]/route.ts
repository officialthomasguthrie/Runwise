/**
 * API Route: /api/webhooks/[path]
 * Dynamic webhook endpoint that receives webhook payloads
 * and triggers active workflows with matching webhook paths
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { inngest } from '@/inngest/client';
import type { Node } from '@xyflow/react';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
    const { path: webhookPath } = await params;
    
    // Get the webhook payload
    let payload: any;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      payload = Object.fromEntries(formData);
    } else {
      // Try to parse as JSON, fallback to text
      try {
        const text = await request.text();
        payload = JSON.parse(text);
      } catch {
        payload = { raw: await request.text() };
      }
    }

    // Get all headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Find active workflows with matching webhook path
    const supabase = createAdminClient();
    const { data: workflows, error } = await (supabase as any)
      .from('workflows')
      .select('id, workflow_data, user_id, name')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching workflows for webhook:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    if (!workflows || workflows.length === 0) {
      return NextResponse.json(
        { error: 'No active workflows found' },
        { status: 404 }
      );
    }

    // Find workflows with webhook triggers matching this path
    const matchingWorkflows = workflows.filter((workflow: any) => {
      if (!workflow.workflow_data?.nodes) return false;
      
      const nodes = workflow.workflow_data.nodes as Node[];
      const webhookTrigger = nodes.find(
        node => node.data?.nodeId === 'webhook-trigger'
      );

      if (!webhookTrigger) return false;

      const config = (webhookTrigger.data?.config || {}) as Record<string, any>;
      const triggerPath = config.path as string | undefined;

      return triggerPath === webhookPath;
    });

    if (matchingWorkflows.length === 0) {
      return NextResponse.json(
        { error: 'No workflow found for this webhook path' },
        { status: 404 }
      );
    }

    // Trigger all matching workflows
    const triggeredWorkflows: string[] = [];

    for (const workflow of matchingWorkflows) {
      const nodes = workflow.workflow_data.nodes as Node[];
      const edges = workflow.workflow_data.edges || [];

      // Send event to trigger workflow execution
      await inngest.send({
        name: 'workflow/execute',
        data: {
          workflowId: workflow.id,
          nodes: nodes,
          edges: edges,
          triggerData: {
            webhookPath: webhookPath,
            payload: payload,
            headers: headers,
            receivedAt: new Date().toISOString(),
          },
          userId: workflow.user_id,
          triggerType: 'webhook',
        },
      });

      triggeredWorkflows.push(workflow.id);
    }

    return NextResponse.json({
      success: true,
      message: `Triggered ${triggeredWorkflows.length} workflow(s)`,
      workflowIds: triggeredWorkflows,
      webhookPath: webhookPath,
    });
  } catch (error: any) {
    console.error('Error in webhook handler:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Support GET requests for webhook verification (some services use GET)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
    const { path: webhookPath } = await params;
    
    // Check if any active workflow has this webhook path
    const supabase = createAdminClient();
    const { data: workflows, error } = await (supabase as any)
      .from('workflows')
      .select('id, workflow_data, user_id, name')
      .eq('status', 'active');

    if (error) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    if (!workflows || workflows.length === 0) {
      return NextResponse.json(
        { error: 'No active workflows found' },
        { status: 404 }
      );
    }

    // Check if any workflow matches this path
    const hasMatchingWorkflow = workflows.some((workflow: any) => {
      if (!workflow.workflow_data?.nodes) return false;
      
      const nodes = workflow.workflow_data.nodes as Node[];
      const webhookTrigger = nodes.find(
        node => node.data?.nodeId === 'webhook-trigger'
      );

      if (!webhookTrigger) return false;

      const config = (webhookTrigger.data?.config || {}) as Record<string, any>;
      const triggerPath = config.path as string | undefined;

      return triggerPath === webhookPath;
    });

    if (hasMatchingWorkflow) {
      return NextResponse.json({
        success: true,
        message: 'Webhook endpoint is active',
        webhookPath: webhookPath,
      });
    }

    return NextResponse.json(
      { error: 'No workflow found for this webhook path' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Error in webhook GET handler:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify webhook',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

