/**
 * POST /api/agents/[id]/activate
 *
 * Transitions agent from pending_integrations → active when all required
 * integrations (for polling triggers) are connected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { enableAgentBehaviours } from '@/lib/agents/behaviour-manager';
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

    const { data: agent, error: agentError } = await (admin as any)
      .from('agents')
      .select('id, status, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.status !== 'pending_integrations') {
      return NextResponse.json(
        { error: `Agent must be in pending_integrations status to activate. Current: ${agent.status}` },
        { status: 400 }
      );
    }

    // Fetch behaviours to compute required integrations
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
          error: 'Connect all required integrations before activating',
          requiredIntegrations: disconnected.map((i) => ({ service: i.service, label: i.label })),
        },
        { status: 400 }
      );
    }

    // Update status and enable behaviours
    const { data: updated, error: updateError } = await (admin as any)
      .from('agents')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Failed to activate agent', details: updateError?.message },
        { status: 500 }
      );
    }

    await enableAgentBehaviours(id, user.id);

    return NextResponse.json({
      agent: updated,
      success: true,
    });
  } catch (err: any) {
    console.error('[POST /api/agents/[id]/activate]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
