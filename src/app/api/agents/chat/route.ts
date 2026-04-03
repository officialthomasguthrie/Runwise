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
  extractEmailSendingModeFromQuestionnaireHints,
} from '@/lib/agents/chat-pipeline';
import { getUserIntegrations } from '@/lib/integrations/service';
import { createAdminClient } from '@/lib/supabase-admin';
import type { AgentEmailSendingMode } from '@/lib/agents/types';
import { checkCreditsAvailable } from '@/lib/credits/tracker';
import { getGenerationCreditCap } from '@/lib/credits/calculator';
import {
  blockIfFreeTierNeedsCredits,
  loadChatCreditGateState,
  shouldApplyChatCredits,
} from '@/lib/credits/chat-credit-gate';
import { finalizeTokenMeteredCredits } from '@/lib/credits/agent-builder-credits';
import { createOpenAIUsageSink } from '@/lib/ai/openai-usage';

/** Push "Thinking..." immediately as one chunk (not streamed) */
function streamThinking(writer: ReturnType<typeof createSSEStream>['writer']) {
  writer.text('Thinking...');
}

/** Stream text in small token-like chunks so fallback/errors match normal AI streaming */
async function streamTextChunked(writer: ReturnType<typeof createSSEStream>['writer'], text: string) {
  // Give the "Thinking..." loader a brief visible window before reply starts.
  await new Promise((r) => setTimeout(r, 160));
  const chunks = text.match(/.{1,8}(\s+|$)|\S+\s*/g) ?? [text];
  const delayMs = 16;
  for (const chunk of chunks) {
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
      const reserve = getGenerationCreditCap();
      const creditCheck = await checkCreditsAvailable(user.id, reserve);
      if (!creditCheck.available) {
        return new Response(
          JSON.stringify({
            error: creditCheck.message || 'Insufficient credits',
            credits: { required: reserve, available: creditCheck.balance },
          }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const { readable, writer } = createSSEStream();

    // Run pipeline asynchronously — stream will be consumed by the client
    (async () => {
      const usageSink = createOpenAIUsageSink();
      const meterTurn = () =>
        finalizeTokenMeteredCredits({
          userId: user.id,
          shouldCharge: shouldChargeCredits,
          totals: usageSink.getTotals(),
          reason: 'agent_builder_chat',
          metadata: { promptPreview: latestUserContent.slice(0, 120) },
        });

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
          const intent = await analyzeAgentIntent(messages, usageSink);
          if (intent.wantsAgent) {
            const admin = createAdminClient();
            const { data: agent, error: agentError } = await (admin as any)
              .from('agents')
              .select('id, name, persona, instructions, avatar_emoji, email_sending_mode')
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
          const feasibility = await checkAgentFeasibility(
            adjustmentDescription,
            userIntegrationNames,
            usageSink
          );
          if (!feasibility.feasible && feasibility.reason) {
            await streamTextChunked(writer, feasibility.reason);
            writer.textDone();
            await meterTurn();
            writer.close();
            return;
          }
          const plan = await regenerateAgentPlan(
            effectivePendingPlan,
            latestUserContent,
            userIntegrationNames,
            usageSink
          );
          const adjustmentContext = `User asked to adjust: ${latestUserContent}`;
          await streamPlanIntro(writer, plan, adjustmentContext, usageSink);
          writer.card({ type: 'plan', plan });
          await meterTurn();
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

        // Fast-fail on impossible capabilities right after a questionnaire submission.
        // This prevents continuing into more rounds (or plan generation) when an answer
        // explicitly requests unsupported integrations/actions.
        if (answers && answers.length > 0) {
          const answeredFeasibility = await checkAgentFeasibility(
            description,
            userIntegrationNames,
            usageSink
          );
          if (!answeredFeasibility.feasible && answeredFeasibility.reason) {
            await streamTextChunked(writer, answeredFeasibility.reason);
            writer.textDone();
            await meterTurn();
            writer.close();
            return;
          }
        }

        // Agent intent detection — respond conversationally if user is just chatting/asking
        const intent = await analyzeAgentIntent(messages, usageSink);
        if (!intent.wantsAgent) {
          await streamAgentChatResponse(writer, messages, undefined, usageSink);
          await meterTurn();
          return;
        }

        // Clarification check BEFORE feasibility so vague requests get refined first.
        // Pass accumulated answers so round 2+ can ask context-dependent follow-up questions
        // (e.g. after user picks "Slack", round 2 asks "which channel?" as a plain question).
        const analysis = await analyzeClarificationNeeds(
          description,
          messages,
          answers ?? undefined,
          usageSink
        );

        if (analysis.needsClarification && analysis.questions.length > 0) {
          const isFollowUp = !!(answers && answers.length > 0);
          await streamClarificationIntro(writer, analysis.summary || '', isFollowUp, usageSink);
          writer.card({ type: 'questionnaire', questions: analysis.questions });
          await meterTurn();
          writer.close();
          return;
        }

        // Feasibility check after clarification; now we have richer requirements context.
        const feasibility = await checkAgentFeasibility(description, userIntegrationNames, usageSink);
        if (!feasibility.feasible && feasibility.reason) {
          await streamTextChunked(writer, feasibility.reason);
          writer.textDone();
          await meterTurn();
          writer.close();
          return;
        }

        // All clarification done — now generate the plan
        const plan = await planAgent(description, userIntegrationNames, usageSink);

        const modeFromEnrichedPrompt = extractEmailSendingModeFromQuestionnaireHints(description);
        if (modeFromEnrichedPrompt) {
          plan.emailSendingMode = modeFromEnrichedPrompt;
        }

        // Phase 6: map questionnaire answers → deterministic plan fields
        // so the deploy planner doesn't need to "guess" which sender path to use.
        if (answers && answers.length > 0) {
          const extractAnswerText = (a: (typeof answers)[number]): string => {
            const v = Array.isArray(a.answer) ? a.answer.join(', ') : a.answer;
            return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
          };

          const emailSenderChoice = answers.find(
            (a) => a.questionId === 'email_sender_choice' || /email sender/i.test(a.question)
          );
          const emailSenderChoiceText = emailSenderChoice ? extractAnswerText(emailSenderChoice) : '';

          const inferredEmailSendingMode: AgentEmailSendingMode | null =
            /Gmail/i.test(emailSenderChoiceText)
              ? 'user_gmail'
              : /dedicated address|Runwise-provided|Runwise|Resend|platform-agent-email|agent email|agent address|platform-managed/i.test(
                  emailSenderChoiceText
                )
                ? 'agent_resend'
                : null;

          const agentFromNameAnswer = answers.find(
            (a) => a.questionId === 'agent_resend_from_name' || /From header|agent address|display name/i.test(a.question)
          );
          const agentFromNameText = agentFromNameAnswer ? extractAnswerText(agentFromNameAnswer) : '';

          if (inferredEmailSendingMode) {
            (plan as any).emailSendingMode = inferredEmailSendingMode;

            // Phase 3 currently provisions `resend_from_name` from `plan.name`,
            // so when the user provides the agent From-header display name we
            // map it onto plan.name for now.
            if (inferredEmailSendingMode === 'agent_resend' && agentFromNameText) {
              plan.name = agentFromNameText.replace(/[\r\n]+/g, ' ').trim().slice(0, 80) || plan.name;
            }

            // Ensure the runtime instructions tell the model which outbound tool to call.
            const instructions = typeof plan.instructions === 'string' ? plan.instructions : '';
            const emailHint =
              inferredEmailSendingMode === 'user_gmail'
                ? "Outbound email: use `send_email_gmail` for sending/replying from the user's connected Gmail (google-gmail). Gmail is required for the user mailbox path."
                : "Outbound email: use `send_email_resend` for sending from the agent's dedicated platform address (Resend). Gmail OAuth is not required for this agent-address send path.";

            // If the user chose agent Resend, prevent any conflicting instruction text
            // from steering the model back to `send_email_gmail`.
            let sanitizedInstructions = instructions;
            if (inferredEmailSendingMode === 'agent_resend') {
              sanitizedInstructions = sanitizedInstructions.replace(/\bsend_email_gmail\b/g, 'send_email_resend');
            } else if (inferredEmailSendingMode === 'user_gmail') {
              sanitizedInstructions = sanitizedInstructions.replace(/\bsend_email_resend\b/g, 'send_email_gmail');
            }

            // Always append the correct, explicit hint at the end so the runtime hint
            // and this hint agree.
            plan.instructions = `${sanitizedInstructions}\n\n${emailHint}`;
          }
        }

        await streamPlanIntro(writer, plan, description, usageSink);
        writer.card({ type: 'plan', plan });
        await meterTurn();
        writer.close();
      } catch (err: any) {
        console.error('[POST /api/agents/chat]', err);
        try {
          await meterTurn();
        } catch {
          /* metering must not mask the original error */
        }
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
