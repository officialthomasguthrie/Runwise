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
      .select('id, status, name')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      console.error('[POST /api/agents/[id]/run] Agent lookup failed:', agentError?.message ?? 'not found');
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.status !== 'active') {
      return NextResponse.json(
        { error: `Agent must be active to run. Current status: ${agent.status}` },
        { status: 400 }
      );
    }

    console.log(`[POST /api/agents/[id]/run] Sending agent/run event for "${agent.name}" (${agentId})`);

    let sendResult: any;
    try {
      sendResult = await inngest.send({
        name: 'agent/run',
        data: {
          agentId,
          userId: user.id,
          behaviourId: null,
          triggerType: 'manual',
          triggerData: {},
        },
      });
    } catch (inngestErr: any) {
      console.error('[POST /api/agents/[id]/run] Inngest send failed:', inngestErr?.message ?? inngestErr);
      return NextResponse.json(
        { error: `Failed to trigger agent run: ${inngestErr?.message ?? 'Inngest event send failed'}` },
        { status: 502 }
      );
    }

    const eventId =
      (sendResult as any)?.ids?.[0] ??
      (sendResult as any)?.[0]?.ids?.[0] ??
      (sendResult as any)?.[0] ??
      undefined;

    console.log(`[POST /api/agents/[id]/run] Inngest event sent. eventId=${eventId}`);

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
