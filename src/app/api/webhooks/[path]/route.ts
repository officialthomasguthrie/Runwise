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

    // Fetch all workflows (any status) so we can:
    //  a) save the sample payload for testing even while the workflow is a draft
    //  b) only trigger execution for active workflows
    const supabase = createAdminClient();
    const { data: workflows, error } = await (supabase as any)
      .from('workflows')
      .select('id, workflow_data, user_id, name, status');

    if (error) {
      console.error('Error fetching workflows for webhook:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Find ALL workflows (any status) that have a webhook-trigger matching this path
    const matchesPath = (workflow: any): boolean => {
      if (!workflow.workflow_data?.nodes) return false;
      const nodes = workflow.workflow_data.nodes as Node[];
      const webhookTrigger = nodes.find(
        node => node.data?.nodeId === 'webhook-trigger'
      );
      if (!webhookTrigger) return false;
      const config = (webhookTrigger.data?.config || {}) as Record<string, any>;
      return (config.path as string | undefined) === webhookPath;
    };

    const matchingWorkflows = (workflows || []).filter(matchesPath);

    if (matchingWorkflows.length === 0) {
      return NextResponse.json(
        { error: 'No workflow found for this webhook path' },
        { status: 404 }
      );
    }

    const triggeredWorkflows: string[] = [];

    for (const workflow of matchingWorkflows) {
      const nodes = workflow.workflow_data.nodes as Node[];
      const edges = workflow.workflow_data.edges || [];

      // Always save the latest payload as a sample regardless of workflow status.
      // This lets users test their webhook while the workflow is still a draft.
      try {
        await (supabase as any)
          .from('workflows')
          .update({
            workflow_data: {
              ...workflow.workflow_data,
              lastWebhookSample: {
                payload,
                receivedAt: new Date().toISOString(),
                webhookPath,
              },
            },
          })
          .eq('id', workflow.id);
      } catch (sampleErr) {
        console.warn('Could not save webhook sample:', sampleErr);
      }

      // Only trigger execution for active workflows
      if (workflow.status !== 'active') continue;

      await inngest.send({
        name: 'workflow/execute',
        data: {
          workflowId: workflow.id,
          nodes: nodes,
          edges: edges,
          triggerData: {
            ...(typeof payload === 'object' && payload !== null && !Array.isArray(payload)
              ? payload
              : { _body: payload }),
            _webhookPath: webhookPath,
            _headers: headers,
            _receivedAt: new Date().toISOString(),
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
    
    // Check if any workflow (any status) has this webhook path
    const supabase = createAdminClient();
    const { data: workflows, error } = await (supabase as any)
      .from('workflows')
      .select('id, workflow_data, user_id, name, status');

    if (error) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Check if any workflow matches this path
    const hasMatchingWorkflow = (workflows || []).some((workflow: any) => {
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

