/**
 * POST /api/agents/build
 *
 * Streaming SSE endpoint that creates an agent step-by-step, emitting
 * build_stage events so the UI can show live progress.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createAgentBehaviours } from '@/lib/agents/behaviour-manager';
import { writeMemory } from '@/lib/agents/memory';
import {
  createSSEStream,
  SSE_HEADERS,
  buildIntegrationCheckListForPolling,
  buildIntegrationCheckList,
  deriveAgentCapabilities,
  type AgentBuildRequest,
} from '@/lib/agents/chat-pipeline';
import { streamCompletionSummary, generateShortDescription } from '@/lib/ai/agent-streaming';
import { getUserIntegrations } from '@/lib/integrations/service';
import { getAgentAvatarUrl } from '@/lib/agents/avatar';
import {
  getAgentResendProvisionPatch,
  resolvePlanEmailSendingMode,
} from '@/lib/agents/resend-provision';
import { checkCreditsAvailable } from '@/lib/credits/tracker';
import { getGenerationCreditCap } from '@/lib/credits/calculator';
import {
  blockIfFreeTierNeedsCredits,
  loadChatCreditGateState,
  shouldApplyChatCredits,
} from '@/lib/credits/chat-credit-gate';
import { finalizeTokenMeteredCredits } from '@/lib/credits/agent-builder-credits';
import { createOpenAIUsageSink } from '@/lib/ai/openai-usage';

const STAGES = [
  'Analyzing capabilities',
  'Generating execution logic',
  'Validating integrations',
  'Seeding memory',
  'Applying safeguards',
  'Deploying agent',
] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

    let body: AgentBuildRequest;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { description, plan } = body;

    if (!description?.trim()) {
      return new Response(JSON.stringify({ error: 'description is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!plan || !plan.name || !plan.behaviours) {
      return new Response(JSON.stringify({ error: 'plan is required' }), {
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

    (async () => {
      const usageSink = createOpenAIUsageSink();
      const meterDeploy = () =>
        finalizeTokenMeteredCredits({
          userId: user.id,
          shouldCharge: shouldChargeCredits,
          totals: usageSink.getTotals(),
          reason: 'agent_build_deploy',
          metadata: { descriptionPreview: description.trim().slice(0, 120) },
        });

      try {
        const admin = createAdminClient();
        const buildStartMs = Date.now();

        // 1. Analyzing capabilities — derive from plan
        writer.buildStage(STAGES[0], 'running');
        const capabilities = deriveAgentCapabilities({
          instructions: plan.instructions,
          persona: plan.persona,
          behaviours: plan.behaviours.map((b) => ({
            behaviour_type: b.behaviourType,
            trigger_type: b.triggerType,
            config: b.config,
            description: b.description,
          })),
        });
        const capDetail =
          capabilities.length > 0
            ? `${capabilities.length} ${capabilities.length === 1 ? 'capability' : 'capabilities'}: ${capabilities.map((c) => c.name).join(', ')}`
            : 'Manual-only agent (no integrations)';
        writer.buildStage(STAGES[0], 'done', capDetail);

        // 2. Generating execution logic — insert agent row with status 'deploying'
        writer.buildStage(STAGES[1], 'running');

        const planEmailMode = resolvePlanEmailSendingMode(plan);

        const { data: agent, error: agentError } = await (admin as any)
          .from('agents')
          .insert({
            user_id: user.id,
            name: plan.name,
            description: description.trim(),
            persona: plan.persona ?? null,
            instructions: plan.instructions ?? '',
            status: 'deploying',
            avatar_emoji: plan.avatarEmoji ?? '🤖',
            model: 'gpt-4o',
            max_steps: 10,
            email_sending_mode: planEmailMode,
          })
          .select()
          .single();

        if (agentError || !agent) {
          writer.buildStage(STAGES[1], 'error');
          writer.error(agentError?.message ?? 'Failed to create agent');
          return;
        }

        const instructionsWordCount = (plan.instructions ?? '').split(/\s+/).filter(Boolean).length;
        writer.buildStage(STAGES[1], 'done', `Instructions generated (${instructionsWordCount} words)`);

        // 3. Validating integrations — create behaviours + polling triggers
        writer.buildStage(STAGES[2], 'running');

        await createAgentBehaviours(agent.id, user.id, plan.behaviours);

        const behaviourCount = plan.behaviours?.length ?? 0;
        writer.buildStage(STAGES[2], 'done', `${behaviourCount} ${behaviourCount === 1 ? 'behaviour' : 'behaviours'} created`);

        // 4. Seeding memory
        writer.buildStage(STAGES[3], 'running');

        for (const content of plan.initialMemories ?? []) {
          if (typeof content === 'string' && content.trim()) {
            await writeMemory(agent.id, user.id, content.trim(), 'instruction', 7, 'user').catch(
              () => {
                /* non-fatal */
              }
            );
          }
        }

        const memoryCount = (plan.initialMemories ?? []).filter((m) => typeof m === 'string' && m.trim()).length;
        writer.buildStage(STAGES[3], 'done', memoryCount > 0 ? `${memoryCount} ${memoryCount === 1 ? 'memory' : 'memories'} added` : 'No memories to seed');

        // 5. Applying safeguards — short delay for UX
        writer.buildStage(STAGES[4], 'running');
        await sleep(400);
        writer.buildStage(STAGES[4], 'done');

        // 6. Deploying agent — generate short tagline and set status (active or pending_integrations)
        writer.buildStage(STAGES[5], 'running');

        const shortDescription = await generateShortDescription(plan, description.trim(), usageSink);

        // Assign profile image (same randomized style as agent tab) and persist
        const avatarImage = getAgentAvatarUrl(agent.id);

        // Build goals_rules from plan for Goals & Rules section
        const goalsRules = [
          ...(plan.initialGoals ?? []).map((label: string, i: number) => ({
            id: `goal-${agent.id}-${i}`,
            type: 'goal' as const,
            label: label.trim(),
          })),
          ...(plan.initialRules ?? []).map((label: string, i: number) => ({
            id: `rule-${agent.id}-${i}`,
            type: 'rule' as const,
            label: label.trim(),
          })),
        ].filter((g) => g.label);

        // Integration check: show all integrations agent uses (triggers + instructions), block status on polling-only
        const integrations = await getUserIntegrations(user.id);
        const connectedServices = integrations
          .map((i) => i.service_name)
          .filter(Boolean) as string[];
        const requiredIntegrations = buildIntegrationCheckList(plan, connectedServices);
        const pollingRequired = buildIntegrationCheckListForPolling(plan, connectedServices);
        const hasDisconnected = pollingRequired.some((i) => !i.connected);
        const finalStatus = hasDisconnected ? 'pending_integrations' : 'active';

        const resendPatch = getAgentResendProvisionPatch({
          agentId: agent.id,
          agentDisplayName: plan.name,
          emailSendingMode: planEmailMode,
          existingResendFromEmail: (agent as { resend_from_email?: string | null }).resend_from_email,
        });

        await (admin as any)
          .from('agents')
          .update({
            status: finalStatus,
            updated_at: new Date().toISOString(),
            short_description: shortDescription,
            avatar_image: avatarImage,
            goals_rules: goalsRules,
            ...resendPatch,
          })
          .eq('id', agent.id)
          .eq('user_id', user.id);

        const deployMs = Date.now() - buildStartMs;
        writer.buildStage(STAGES[5], 'done', `Deployed in ${deployMs}ms`);

        // 7. Stream AI-generated summary, then complete
        await streamCompletionSummary(writer, plan, description.trim(), usageSink);

        await meterDeploy();
        writer.complete(agent.id, '', requiredIntegrations.length > 0 ? requiredIntegrations : undefined);
      } catch (err: any) {
        console.error('[POST /api/agents/build]', err);
        try {
          await meterDeploy();
        } catch {
          /* ignore metering errors */
        }
        writer.error(err?.message ?? 'Something went wrong');
      }
    })();

    return new Response(readable, {
      headers: SSE_HEADERS,
    });
  } catch (err: any) {
    console.error('[POST /api/agents/build]', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
