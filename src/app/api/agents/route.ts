/**
 * GET  /api/agents  — list all agents for the authenticated user
 * POST /api/agents  — deploy a new agent from a plain-English description
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { planAgent } from '@/lib/agents/planner';
import { createAgentBehaviours } from '@/lib/agents/behaviour-manager';
import { writeMemory } from '@/lib/agents/memory';
import { getUserIntegrations } from '@/lib/integrations/service';
import type { DeployAgentRequest } from '@/lib/agents/types';

// ── GET — list agents ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch agents
    const { data: agents, error: agentsError } = await (admin as any)
      .from('agents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (agentsError) {
      return NextResponse.json({ error: agentsError.message }, { status: 500 });
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({ agents: [] });
    }

    const agentIds: string[] = agents.map((a: any) => a.id);

    // Fetch counts and last activity for all agents in one pass each
    const [behavioursRes, memoriesRes, activityRes] = await Promise.all([
      (admin as any)
        .from('agent_behaviours')
        .select('agent_id')
        .in('agent_id', agentIds),
      (admin as any)
        .from('agent_memory')
        .select('agent_id')
        .in('agent_id', agentIds),
      (admin as any)
        .from('agent_activity')
        .select('agent_id, created_at, trigger_summary')
        .in('agent_id', agentIds)
        .order('created_at', { ascending: false }),
    ]);

    // Build lookup maps
    const behaviourCounts = countByAgentId(behavioursRes.data ?? []);
    const memoryCounts = countByAgentId(memoriesRes.data ?? []);

    // For activity: count per agent and record the latest entry
    const activityCountMap: Record<string, number> = {};
    const lastActivityMap: Record<string, { at: string; summary: string | null }> = {};

    for (const row of activityRes.data ?? []) {
      activityCountMap[row.agent_id] = (activityCountMap[row.agent_id] ?? 0) + 1;
      if (!lastActivityMap[row.agent_id]) {
        lastActivityMap[row.agent_id] = {
          at: row.created_at,
          summary: row.trigger_summary,
        };
      }
    }

    const enriched = agents.map((a: any) => ({
      ...a,
      behaviour_count: behaviourCounts[a.id] ?? 0,
      memory_count: memoryCounts[a.id] ?? 0,
      activity_count: activityCountMap[a.id] ?? 0,
      last_activity_at: lastActivityMap[a.id]?.at ?? null,
      last_trigger_summary: lastActivityMap[a.id]?.summary ?? null,
    }));

    return NextResponse.json({ agents: enriched });
  } catch (err: any) {
    console.error('[GET /api/agents]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST — deploy agent ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: DeployAgentRequest & { plan?: any };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.description?.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // ── 1. Get connected integrations ────────────────────────────────────────
    const userIntegrations = await getUserIntegrations(user.id);
    const integrationNames = userIntegrations.map((i) => i.service_name).filter(Boolean);

    // ── 2. Plan (or use a pre-computed plan if the UI sent one) ──────────────
    let plan = body.plan;
    if (!plan) {
      plan = await planAgent(body.description, integrationNames);
    }

    // Allow caller to override name/emoji
    if (body.name) plan.name = body.name;
    if (body.avatarEmoji) plan.avatarEmoji = body.avatarEmoji;

    // ── 3. Create agent row ───────────────────────────────────────────────────
    const { data: agent, error: agentError } = await (admin as any)
      .from('agents')
      .insert({
        user_id: user.id,
        name: plan.name,
        description: body.description,
        persona: plan.persona,
        instructions: plan.instructions,
        status: 'active',
        avatar_emoji: plan.avatarEmoji,
        model: 'gpt-4o',
        max_steps: 10,
      })
      .select()
      .single();

    if (agentError || !agent) {
      console.error('[POST /api/agents] Failed to create agent:', agentError);
      return NextResponse.json(
        { error: 'Failed to create agent', details: agentError?.message },
        { status: 500 }
      );
    }

    // ── 4. Create behaviours (+ polling triggers) ─────────────────────────────
    await createAgentBehaviours(agent.id, user.id, plan.behaviours);

    // ── 5. Seed initial memories ──────────────────────────────────────────────
    for (const content of plan.initialMemories ?? []) {
      await writeMemory(agent.id, user.id, content, 'instruction', 7, 'user').catch(() => {
        /* non-fatal */
      });
    }

    return NextResponse.json({ agent, plan }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/agents]', err);
    return NextResponse.json(
      { error: 'Failed to deploy agent', details: err?.message },
      { status: 500 }
    );
  }
}

// ── Util ─────────────────────────────────────────────────────────────────────

function countByAgentId(rows: Array<{ agent_id: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    counts[r.agent_id] = (counts[r.agent_id] ?? 0) + 1;
  }
  return counts;
}
