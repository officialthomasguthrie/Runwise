/**
 * POST /api/agents/[id]/chat
 *
 * Owner ↔ agent workspace chat: full agent context (persona, instructions, memory,
 * recent activity, behaviours), tool calls to update memory / profile / instructions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { requireAgentBuilderAccess } from '@/lib/agents/plan-gate';
import {
  createSSEStream,
  SSE_HEADERS,
  deriveAgentCapabilities,
  type AgentForCapabilities,
} from '@/lib/agents/chat-pipeline';
import { getAgentMemory } from '@/lib/agents/memory';
import { formatCapabilitiesForWorkspace } from '@/lib/agents/workspace-chat-prompt';
import { runAgentWorkspaceChat } from '@/lib/ai/agent-workspace-stream';
import type { Agent, AgentActivity, AgentBehaviour } from '@/lib/agents/types';
import { checkCreditsAvailable } from '@/lib/credits/tracker';
import { getGenerationCreditCap } from '@/lib/credits/calculator';
import {
  blockIfFreeTierNeedsCredits,
  loadChatCreditGateState,
  shouldApplyChatCredits,
} from '@/lib/credits/chat-credit-gate';
import { finalizeTokenMeteredCredits } from '@/lib/credits/agent-builder-credits';
import { createOpenAIUsageSink } from '@/lib/ai/openai-usage';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gate = await requireAgentBuilderAccess(user.id);
    if (gate) return gate;

    const creditState = await loadChatCreditGateState(user.id);
    const freeGateBlock = await blockIfFreeTierNeedsCredits(user.id, creditState);
    if (freeGateBlock) return freeGateBlock;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI service is not configured.' }, { status: 500 });
    }

    const shouldChargeCredits = shouldApplyChatCredits(creditState);
    if (shouldChargeCredits) {
      const reserve = getGenerationCreditCap();
      const creditCheck = await checkCreditsAvailable(user.id, reserve);
      if (!creditCheck.available) {
        return NextResponse.json(
          {
            error: creditCheck.message || 'Insufficient credits',
            credits: { required: reserve, available: creditCheck.balance },
          },
          { status: 402 }
        );
      }
    }

    const { id: agentId } = await context.params;

    let body: { messages?: Array<{ role: 'user' | 'assistant'; content: string }> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const messages = body.messages ?? [];
    if (messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: agentRow, error: agentError } = await (admin as any)
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agentRow) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = agentRow as Agent;

    const [memories, behavioursRes, activityRes] = await Promise.all([
      getAgentMemory(agentId, user.id, 60),
      (admin as any)
        .from('agent_behaviours')
        .select('*')
        .eq('agent_id', agentId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      (admin as any)
        .from('agent_activity')
        .select('*')
        .eq('agent_id', agentId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25),
    ]);

    const behaviours = (behavioursRes.data ?? []) as AgentBehaviour[];
    const activities = (activityRes.data ?? []) as AgentActivity[];

    const caps = deriveAgentCapabilities({
      instructions: agent.instructions,
      persona: agent.persona,
      behaviours: behaviours as AgentForCapabilities['behaviours'],
    });
    const capabilitiesBlock = formatCapabilitiesForWorkspace(caps);

    const { readable, writer } = createSSEStream();

    (async () => {
      const usageSink = createOpenAIUsageSink();
      try {
        await runAgentWorkspaceChat({
          writer,
          agent,
          userId: user.id,
          messages,
          memories,
          activities,
          behaviours,
          capabilitiesLines: capabilitiesBlock,
          usageSink,
        });
        await finalizeTokenMeteredCredits({
          userId: user.id,
          shouldCharge: shouldChargeCredits,
          totals: usageSink.getTotals(),
          reason: 'agent_workspace_chat',
          metadata: { agentId },
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[POST /api/agents/[id]/chat]', err);
        try {
          await finalizeTokenMeteredCredits({
            userId: user.id,
            shouldCharge: shouldChargeCredits,
            totals: usageSink.getTotals(),
            reason: 'agent_workspace_chat',
            metadata: { agentId },
          });
        } catch {
          /* ignore metering errors */
        }
        writer.error(msg ?? 'Something went wrong');
      }
    })();

    return new Response(readable, { headers: SSE_HEADERS });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/agents/[id]/chat]', err);
    return NextResponse.json({ error: msg ?? 'Internal server error' }, { status: 500 });
  }
}
