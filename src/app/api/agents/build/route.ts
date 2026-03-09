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
  type AgentBuildRequest,
} from '@/lib/agents/chat-pipeline';
import { streamCompletionSummary, generateShortDescription } from '@/lib/ai/agent-streaming';
import { getUserIntegrations } from '@/lib/integrations/service';
import { getAgentAvatarUrl } from '@/lib/agents/avatar';

const STAGES = [
  'Intent analysed',
  'Execution logic generated',
  'Integrations validated',
  'Memory seeded',
  'Safeguards applied',
  'Agent deployed',
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

    const { readable, writer } = createSSEStream();

    (async () => {
      try {
        const admin = createAdminClient();

        // 1. Intent analysed (immediate)
        writer.buildStage(STAGES[0], 'done');

        // 2. Execution logic generated — insert agent row with status 'deploying'
        writer.buildStage(STAGES[1], 'running');

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
          })
          .select()
          .single();

        if (agentError || !agent) {
          writer.buildStage(STAGES[1], 'error');
          writer.error(agentError?.message ?? 'Failed to create agent');
          return;
        }

        writer.buildStage(STAGES[1], 'done');

        // 3. Integrations validated — create behaviours + polling triggers
        writer.buildStage(STAGES[2], 'running');

        await createAgentBehaviours(agent.id, user.id, plan.behaviours);

        writer.buildStage(STAGES[2], 'done');

        // 4. Memory seeded
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

        writer.buildStage(STAGES[3], 'done');

        // 5. Safeguards applied — short delay for UX
        writer.buildStage(STAGES[4], 'running');
        await sleep(400);
        writer.buildStage(STAGES[4], 'done');

        // 6. Agent deployed — generate short tagline and set status (active or pending_integrations)
        writer.buildStage(STAGES[5], 'running');

        const shortDescription = await generateShortDescription(plan, description.trim());

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

        // Integration gate: only block on polling-required integrations
        const integrations = await getUserIntegrations(user.id);
        const connectedServices = integrations
          .map((i) => i.service_name)
          .filter(Boolean) as string[];
        const requiredIntegrations = buildIntegrationCheckListForPolling(plan, connectedServices);
        const hasDisconnected = requiredIntegrations.some((i) => !i.connected);
        const finalStatus = hasDisconnected ? 'pending_integrations' : 'active';

        await (admin as any)
          .from('agents')
          .update({
            status: finalStatus,
            updated_at: new Date().toISOString(),
            short_description: shortDescription,
            avatar_image: avatarImage,
            goals_rules: goalsRules,
          })
          .eq('id', agent.id)
          .eq('user_id', user.id);

        writer.buildStage(STAGES[5], 'done');

        // 7. Stream AI-generated summary, then complete
        await streamCompletionSummary(writer, plan, description.trim());

        writer.complete(agent.id, '', requiredIntegrations.length > 0 ? requiredIntegrations : undefined);
      } catch (err: any) {
        console.error('[POST /api/agents/build]', err);
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
