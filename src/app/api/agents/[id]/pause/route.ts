/**
 * POST /api/agents/[id]/pause
 *
 * Toggles the agent between active and paused.
 * - active  → paused  : disables all behaviours + polling triggers
 * - paused  → active  : re-enables all behaviours + polling triggers
 *
 * Returns the updated agent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { enableAgentBehaviours, disableAgentBehaviours } from '@/lib/agents/behaviour-manager';
import {
  planFromBehaviours,
  buildIntegrationCheckListForPolling,
} from '@/lib/agents/chat-pipeline';
import { getUserIntegrations } from '@/lib/integrations/service';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const admin = createAdminClient();

    // Fetch current agent status
    const { data: agent, error: agentError } = await (admin as any)
      .from('agents')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Only toggle between active ↔ paused
    if (agent.status !== 'active' && agent.status !== 'paused') {
      return NextResponse.json(
        { error: `Cannot toggle agent in status: ${agent.status}` },
        { status: 400 }
      );
    }

    const newStatus = agent.status === 'active' ? 'paused' : 'active';

    // When resuming (paused → active), verify required integrations are connected
    if (newStatus === 'active') {
      const { data: behaviours } = await (admin as any)
        .from('agent_behaviours')
        .select('behaviour_type, trigger_type, config, description')
        .eq('agent_id', id);
      const plan = planFromBehaviours(behaviours ?? []);
      const integrations = await getUserIntegrations(user.id);
      const connectedServices = integrations
        .map((i) => i.service_name)
        .filter(Boolean) as string[];
      const requiredIntegrations = buildIntegrationCheckListForPolling(plan, connectedServices);
      const disconnected = requiredIntegrations.filter((i) => !i.connected);
      if (disconnected.length > 0) {
        return NextResponse.json(
          {
            error: 'Connect all required integrations before resuming',
            requiredIntegrations: disconnected.map((i) => ({ service: i.service, label: i.label })),
          },
          { status: 400 }
        );
      }
    }

    // Update agent status first
    const { data: updated, error: updateError } = await (admin as any)
      .from('agents')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Failed to update agent status', details: updateError?.message },
        { status: 500 }
      );
    }

    // Sync behaviours and polling triggers
    if (newStatus === 'paused') {
      await disableAgentBehaviours(id, user.id);
    } else {
      await enableAgentBehaviours(id, user.id);
    }

    return NextResponse.json({
      agent: updated,
      previousStatus: agent.status,
      newStatus,
    });
  } catch (err: any) {
    console.error('[POST /api/agents/[id]/pause]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
