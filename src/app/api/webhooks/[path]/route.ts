/**
 * API Route: /api/webhooks/[path]
 * Dynamic webhook endpoint that receives webhook payloads
 * and triggers active workflows or agents with matching webhook paths
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

    const supabase = createAdminClient();
    const triggerData = {
      ...(typeof payload === 'object' && payload !== null && !Array.isArray(payload)
        ? payload
        : { _body: payload }),
      _webhookPath: webhookPath,
      _headers: headers,
      _receivedAt: new Date().toISOString(),
    };

    // ── 1. Check workflows ───────────────────────────────────────────────────
    const { data: workflows, error: wfError } = await (supabase as any)
      .from('workflows')
      .select('id, workflow_data, user_id, name, status');

    if (wfError) {
      console.error('Error fetching workflows for webhook:', wfError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const matchesPath = (workflow: any): boolean => {
      if (!workflow.workflow_data?.nodes) return false;
      const nodes = workflow.workflow_data.nodes as Node[];
      const webhookTrigger = nodes.find((node) => node.data?.nodeId === 'webhook-trigger');
      if (!webhookTrigger) return false;
      const config = (webhookTrigger.data?.config || {}) as Record<string, any>;
      return (config.path as string | undefined) === webhookPath;
    };

    const matchingWorkflows = (workflows || []).filter(matchesPath);
    const triggeredWorkflows: string[] = [];

    for (const workflow of matchingWorkflows) {
      const nodes = workflow.workflow_data.nodes as Node[];
      const edges = workflow.workflow_data.edges || [];

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

      if (workflow.status === 'active') {
        await inngest.send({
          name: 'workflow/execute',
          data: {
            workflowId: workflow.id,
            nodes,
            edges,
            triggerData,
            userId: workflow.user_id,
            triggerType: 'webhook',
          },
        });
        triggeredWorkflows.push(workflow.id);
      }
    }

    // ── 2. Check agent webhook behaviours ───────────────────────────────────────
    let matchedAnyAgent = false;
    const { data: agentBehaviours, error: abError } = await (supabase as any)
      .from('agent_behaviours')
      .select('id, agent_id, user_id, config')
      .eq('behaviour_type', 'webhook')
      .eq('enabled', true);

    if (!abError && agentBehaviours?.length) {
      const matchingBehaviours = agentBehaviours.filter((b: any) => {
        const path = (b.config || {}).path;
        return typeof path === 'string' && path.trim() === webhookPath;
      });
      matchedAnyAgent = matchingBehaviours.length > 0;

      for (const behaviour of matchingBehaviours) {
        const { data: agent, error: agentError } = await (supabase as any)
          .from('agents')
          .select('id, user_id, status')
          .eq('id', behaviour.agent_id)
          .single();

        if (agentError || !agent) continue;

        // Always save sample for Test Webhook UI (even when agent is paused)
        try {
          await (supabase as any)
            .from('agents')
            .update({
              last_webhook_sample: {
                payload,
                receivedAt: new Date().toISOString(),
                webhookPath,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', agent.id);
        } catch (sampleErr) {
          console.warn('Could not save agent webhook sample:', sampleErr);
        }

        if (agent.status === 'active') {
          await inngest.send({
            name: 'agent/run',
            data: {
              agentId: agent.id,
              userId: agent.user_id,
              behaviourId: behaviour.id,
              triggerType: 'webhook',
              triggerData,
            },
          });
        }
      }
    }

    // ── 3. Fallback: Test-before-save (path = agent-{agentId}) ─────────────────────
    // When user tests webhook before saving, no behaviour exists. If path is agent-{id}
    // and that agent exists, save the sample so the Test Webhook UI can show fields.
    if (!matchedAnyAgent && !matchingWorkflows.length) {
      const agentIdFromPath = webhookPath.startsWith('agent-')
        ? webhookPath.replace(/^agent-/, '')
        : null;
      const isValidAgentId = agentIdFromPath && agentIdFromPath.length >= 20 && agentIdFromPath !== 'new';
      if (isValidAgentId) {
        const { data: agent } = await (supabase as any)
          .from('agents')
          .select('id')
          .eq('id', agentIdFromPath)
          .single();
        if (agent) {
          matchedAnyAgent = true;
          try {
            await (supabase as any)
              .from('agents')
              .update({
                last_webhook_sample: {
                  payload,
                  receivedAt: new Date().toISOString(),
                  webhookPath,
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', agent.id);
          } catch (sampleErr) {
            console.warn('Could not save agent webhook sample (test-before-save):', sampleErr);
          }
        }
      }
    }

    // Return 404 only if nothing matched
    if (matchingWorkflows.length === 0 && !matchedAnyAgent) {
      return NextResponse.json(
        { error: 'No workflow or agent found for this webhook path' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Processed webhook`,
      workflowIds: triggeredWorkflows,
      webhookPath,
    });
  } catch (error: any) {
    console.error('Error in webhook handler:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error.message },
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
    const supabase = createAdminClient();

    // Check workflows
    const { data: workflows, error: wfError } = await (supabase as any)
      .from('workflows')
      .select('id, workflow_data');

    if (!wfError && workflows?.length) {
      const hasMatchingWorkflow = workflows.some((w: any) => {
        const nodes = w.workflow_data?.nodes ?? [];
        const webhookTrigger = nodes.find((n: any) => n.data?.nodeId === 'webhook-trigger');
        return (webhookTrigger?.data?.config?.path as string) === webhookPath;
      });
      if (hasMatchingWorkflow) {
        return NextResponse.json({ success: true, message: 'Webhook endpoint is active', webhookPath });
      }
    }

    // Check agent webhook behaviours
    const { data: agentBehaviours } = await (supabase as any)
      .from('agent_behaviours')
      .select('id, config')
      .eq('behaviour_type', 'webhook')
      .eq('enabled', true);

    let hasMatchingAgent = (agentBehaviours ?? []).some((b: any) => (b.config || {}).path === webhookPath);

    // Fallback: agent-{agentId} path for test-before-save
    if (!hasMatchingAgent && webhookPath.startsWith('agent-')) {
      const agentIdFromPath = webhookPath.replace(/^agent-/, '');
      if (agentIdFromPath.length >= 20 && agentIdFromPath !== 'new') {
        const { data: agent } = await (supabase as any)
          .from('agents')
          .select('id')
          .eq('id', agentIdFromPath)
          .single();
        hasMatchingAgent = !!agent;
      }
    }

    if (hasMatchingAgent) {
      return NextResponse.json({ success: true, message: 'Webhook endpoint is active', webhookPath });
    }

    return NextResponse.json({ error: 'No workflow or agent found for this webhook path' }, { status: 404 });
  } catch (error: any) {
    console.error('Error in webhook GET handler:', error);
    return NextResponse.json({ error: 'Failed to verify webhook', details: error.message }, { status: 500 });
  }
}

