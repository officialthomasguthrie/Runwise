/**
 * POST /api/agents/chat
 *
 * Streaming SSE endpoint for the agent chat builder.
 * Runs the pipeline: intent → integration check → questionnaire (if needed) → plan → confirmation.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getUserIntegrations } from '@/lib/integrations/service';
import { planAgent, regenerateAgentPlan } from '@/lib/agents/planner';
import { analyzeClarificationNeeds, buildEnrichedPrompt } from '@/lib/ai/clarification';
import {
  createSSEStream,
  SSE_HEADERS,
  buildIntegrationCheckList,
  type AgentChatRequest,
} from '@/lib/agents/chat-pipeline';

/** All agent-relevant trigger integrations — used so planner can suggest any trigger */
const ALL_AGENT_SERVICES = [
  'google-gmail',
  'slack',
  'discord',
  'google-sheets',
  'github',
  'google-drive',
  'google-forms',
];

/** Stream a string as text_delta events (chunked by character for smooth feel) */
function streamText(writer: ReturnType<typeof createSSEStream>['writer'], text: string) {
  for (const char of text) {
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

    let body: AgentChatRequest;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, answers, pendingPlan, integrationsConnected } = body;

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
        const connectedServices = integrations
          .map((i) => i.service_name)
          .filter(Boolean) as string[];

        // ── Branch: User wants to adjust the plan ─────────────────────────────
        if (pendingPlan) {
          streamText(writer, 'Updating your plan…');
          writer.textDone();

          const plan = await regenerateAgentPlan(
            pendingPlan,
            latestUserContent,
            connectedServices
          );

          writer.card({ type: 'plan', plan });
          writer.card({ type: 'confirmation' });
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

        streamText(writer, 'Let me analyse that…');
        writer.textDone();

        const plan = await planAgent(description, ALL_AGENT_SERVICES);

        const integrationCheckList = buildIntegrationCheckList(plan, connectedServices);
        const anyMissing = integrationCheckList.some((i) => i.required && !i.connected);

        // If integrations required but not connected, and not resuming after connect
        if (anyMissing && !integrationsConnected) {
          streamText(writer, "You'll need to connect these first:");
          writer.textDone();
          writer.card({ type: 'integration_check', integrations: integrationCheckList });
          writer.close();
          return;
        }

        // All integrations OK or skip — check clarification
        const analysis = await analyzeClarificationNeeds(description, messages);

        if (analysis.needsClarification && analysis.questions.length > 0 && !answers?.length) {
          streamText(writer, analysis.summary || 'A few quick questions:');
          writer.textDone();
          writer.card({ type: 'questionnaire', questions: analysis.questions });
          writer.close();
          return;
        }

        // No clarification or answers provided — use plan (already built with enriched description if answers were provided)
        streamText(writer, `Here's what I'm planning for ${plan.name}:`);
        writer.textDone();
        writer.card({ type: 'plan', plan });
        writer.card({ type: 'confirmation' });
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
