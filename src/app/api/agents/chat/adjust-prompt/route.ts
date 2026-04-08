/**
 * POST /api/agents/chat/adjust-prompt
 *
 * Streams a varied "what would you like to change?" message when the user
 * clicks "Let me adjust something". No plan regeneration — just the prompt.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { streamAdjustPrompt } from '@/lib/ai/agent-streaming';
import { createSSEStream, SSE_HEADERS } from '@/lib/agents/chat-pipeline';
import { checkCreditsAvailableUpToCap } from '@/lib/credits/tracker';
import { getGenerationCreditCap } from '@/lib/credits/calculator';
import {
  blockIfFreeTierNeedsCredits,
  loadChatCreditGateState,
  shouldApplyChatCredits,
} from '@/lib/credits/chat-credit-gate';
import { finalizeTokenMeteredCredits } from '@/lib/credits/agent-builder-credits';
import { createOpenAIUsageSink } from '@/lib/ai/openai-usage';

function streamThinking(writer: ReturnType<typeof createSSEStream>['writer']) {
  for (const char of 'Thinking...') {
    writer.text(char);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const creditState = await loadChatCreditGateState(user.id);
    const freeGateBlock = await blockIfFreeTierNeedsCredits(user.id, creditState);
    if (freeGateBlock) {
      return freeGateBlock;
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service is not configured.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const shouldChargeCredits = shouldApplyChatCredits(creditState);
    if (shouldChargeCredits) {
      const perTurnCap = getGenerationCreditCap();
      const creditCheck = await checkCreditsAvailableUpToCap(user.id, perTurnCap);
      if (!creditCheck.available) {
        return new Response(
          JSON.stringify({
            error: creditCheck.message || 'Insufficient credits',
            credits: { perTurnCap, available: creditCheck.balance },
          }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const { readable, writer } = createSSEStream();

    (async () => {
      const usageSink = createOpenAIUsageSink();
      const meter = () =>
        finalizeTokenMeteredCredits({
          userId: user.id,
          shouldCharge: shouldChargeCredits,
          totals: usageSink.getTotals(),
          reason: 'agent_builder_adjust_prompt',
          metadata: {},
        });

      try {
        streamThinking(writer);
        await streamAdjustPrompt(writer, usageSink);
        await meter();
        writer.close();
      } catch (err: any) {
        console.error('[POST /api/agents/chat/adjust-prompt]', err);
        try {
          await meter();
        } catch {
          /* ignore */
        }
        writer.error(err?.message ?? 'Something went wrong');
      }
    })();

    return new Response(readable, {
      headers: SSE_HEADERS,
    });
  } catch (err: any) {
    console.error('[POST /api/agents/chat/adjust-prompt]', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
