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
