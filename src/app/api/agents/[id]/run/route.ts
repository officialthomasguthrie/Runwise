/**
 * POST /api/agents/[id]/run
 *
 * Manually triggers an agent run via Inngest.
 * Requires agent to be active and owned by the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { inngest } from '@/inngest/client';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: agentId } = await context.params;
    const admin = createAdminClient();

    const { data: agent, error: agentError } = await (admin as any)
      .from('agents')
      .select('id, status')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.status !== 'active') {
      return NextResponse.json(
        { error: `Agent must be active to run. Current status: ${agent.status}` },
        { status: 400 }
      );
    }

    const eventIds = await inngest.send({
      name: 'agent/run',
      data: {
        agentId,
        userId: user.id,
        behaviourId: null,
        triggerType: 'manual',
        triggerData: {},
      },
    });

    const eventId = (eventIds as any)?.[0]?.ids?.[0] ?? (eventIds as any)?.[0];

    return NextResponse.json({
      success: true,
      eventId: eventId ?? undefined,
    });
  } catch (err: any) {
    console.error('[POST /api/agents/[id]/run]', err);
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
