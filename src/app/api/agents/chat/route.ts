/**
 * POST /api/agents/chat
 *
 * Streaming SSE endpoint for the agent chat builder.
 * Runs the pipeline: intent → questionnaire (if needed) → plan → confirmation.
 * Integration check happens post-build in the completion card.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { planAgent, regenerateAgentPlan } from '@/lib/agents/planner';
import { analyzeClarificationNeeds, buildEnrichedPrompt } from '@/lib/ai/clarification';
import { analyzeAgentIntent } from '@/lib/ai/agent-intent';
import { checkAgentFeasibility } from '@/lib/ai/agent-feasibility';
import { streamAgentChatResponse } from '@/lib/ai/agent-chat-response';
import {
  streamClarificationIntro,
  streamPlanIntro,
} from '@/lib/ai/agent-streaming';
import {
  createSSEStream,
  SSE_HEADERS,
  type AgentChatRequest,
  agentToPlan,
} from '@/lib/agents/chat-pipeline';
import { getUserIntegrations } from '@/lib/integrations/service';
import { createAdminClient } from '@/lib/supabase-admin';

/** Stream "Thinking..." — loading placeholder shown while AI is working */
function streamThinking(writer: ReturnType<typeof createSSEStream>['writer']) {
  for (const char of 'Thinking...') {
    writer.text(char);
  }
}

/** Stream text in word-sized chunks with small delays so it appears typed, matching other AI replies */
async function streamTextChunked(writer: ReturnType<typeof createSSEStream>['writer'], text: string) {
  const words = text.split(/(\s+)/); // preserve spaces
  const delayMs = 25;
  for (const chunk of words) {
    if (chunk) {
      writer.text(chunk);
      await new Promise((r) => setTimeout(r, delayMs));
    }
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

    let body: AgentChatRequest;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, answers, pendingPlan, agentId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const latestUser = messages.filter((m) => m.role === 'user').pop();
    const latestUserContent = latestUser?.content?.trim() ?? '';

    if (!latestUserContent) {
      return new Response(JSON.stringify({ error: 'Latest user message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { readable, writer } = createSSEStream();

    // Run pipeline asynchronously — stream will be consumed by the client
    (async () => {
      try {
        const integrations = await getUserIntegrations(user.id);
        const userIntegrationNames = integrations
          .map((i) => i.service_name)
          .filter((n): n is string => !!n);

        // Show "Thinking..." immediately for every message — consistent loading UX
        streamThinking(writer);

        // ── Branch: User wants to adjust the plan ─────────────────────────────
        let effectivePendingPlan = pendingPlan;

        // When editing an existing agent, fetch it and build plan for regeneration
        if (!effectivePendingPlan && agentId) {
          const intent = await analyzeAgentIntent(messages);
          if (intent.wantsAgent) {
            const admin = createAdminClient();
            const { data: agent, error: agentError } = await (admin as any)
              .from('agents')
              .select('id, name, persona, instructions, avatar_emoji')
              .eq('id', agentId)
              .eq('user_id', user.id)
              .single();

            if (!agentError && agent) {
              const { data: behaviours } = await (admin as any)
                .from('agent_behaviours')
                .select('*')
                .eq('agent_id', agentId)
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });
              effectivePendingPlan = agentToPlan(agent, behaviours ?? []);
            }
          }
        }

        if (effectivePendingPlan) {
          const adjustmentDescription = `User wants to change their agent plan: "${latestUserContent}"`;
          const feasibility = await checkAgentFeasibility(adjustmentDescription, userIntegrationNames);
          if (!feasibility.feasible && feasibility.reason) {
            await streamTextChunked(writer, feasibility.reason);
            writer.textDone();
            writer.close();
            return;
          }
          const plan = await regenerateAgentPlan(
            effectivePendingPlan,
            latestUserContent,
            userIntegrationNames
          );
          const adjustmentContext = `User asked to adjust: ${latestUserContent}`;
          await streamPlanIntro(writer, plan, adjustmentContext);
          writer.card({ type: 'plan', plan });
          writer.close();
          return;
        }

        // ── Branch: Full pipeline ───────────────────────────────────────────────

        const description = answers?.length
          ? buildEnrichedPrompt(
              messages
                .filter((m) => m.role === 'user')
                .map((m) => m.content)
                .join('\n\n'),
              answers
            )
          : latestUserContent;

        // Agent intent detection — respond conversationally if user is just chatting/asking
        const intent = await analyzeAgentIntent(messages);
        if (!intent.wantsAgent) {
          await streamAgentChatResponse(writer, messages);
          return;
        }

        // Feasibility check — if we can't build it, explain why and stop (no questionnaire, no plan)
        const feasibility = await checkAgentFeasibility(description, userIntegrationNames);
        if (!feasibility.feasible && feasibility.reason) {
          await streamTextChunked(writer, feasibility.reason);
          writer.textDone();
          writer.close();
          return;
        }

        // Feasible: first delta from streamPlanIntro will replace "Thinking..."
        const plan = await planAgent(description, userIntegrationNames);

        // Check clarification (including multi-round)
        const analysis = await analyzeClarificationNeeds(description, messages);

        if (analysis.needsClarification && analysis.questions.length > 0) {
          await streamClarificationIntro(writer, analysis.summary || '');
          writer.card({ type: 'questionnaire', questions: analysis.questions });
          writer.close();
          return;
        }

        // No clarification needed — stream plan as plain text, then show Build/Adjust buttons
        await streamPlanIntro(writer, plan, description);
        writer.card({ type: 'plan', plan });
        writer.close();
      } catch (err: any) {
        console.error('[POST /api/agents/chat]', err);
        writer.error(err?.message ?? 'Something went wrong');
      }
    })();

    return new Response(readable, {
      headers: SSE_HEADERS,
    });
  } catch (err: any) {
    console.error('[POST /api/agents/chat]', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
