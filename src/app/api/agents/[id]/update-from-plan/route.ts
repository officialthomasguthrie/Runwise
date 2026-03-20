/**
 * POST /api/agents/[id]/update-from-plan
 *
 * Updates an existing agent from a DeployAgentPlan (used when user edits
 * their agent after build). Replaces behaviours and updates name, persona,
 * instructions, avatar_emoji, and goals_rules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  deleteAgentBehaviours,
  createAgentBehaviours,
} from '@/lib/agents/behaviour-manager';
import { buildIntegrationCheckListForPolling } from '@/lib/agents/chat-pipeline';
import { getUserIntegrations } from '@/lib/integrations/service';
import type { DeployAgentPlan } from '@/lib/agents/types';
import {
  getAgentResendProvisionPatch,
  resolvePlanEmailSendingMode,
} from '@/lib/agents/resend-provision';

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

    const { id: agentId } = await context.params;

    let body: { plan: DeployAgentPlan };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { plan } = body;

    if (!plan || !plan.name || !plan.behaviours) {
      return NextResponse.json(
        { error: 'plan with name and behaviours is required' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify ownership
    const { data: agent, error: lookupError } = await (admin as any)
      .from('agents')
      .select('id, status, resend_from_email')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (lookupError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete existing behaviours and polling triggers
    await deleteAgentBehaviours(agentId, user.id);

    // Update agent row
    const goalsRules = [
      ...(plan.initialGoals ?? []).map((label: string, i: number) => ({
        id: `goal-${agentId}-${i}`,
        type: 'goal' as const,
        label: label.trim(),
      })),
      ...(plan.initialRules ?? []).map((label: string, i: number) => ({
        id: `rule-${agentId}-${i}`,
        type: 'rule' as const,
        label: label.trim(),
      })),
    ].filter((g) => g.label);

    const planEmailMode = resolvePlanEmailSendingMode(plan);
    const resendPatch = getAgentResendProvisionPatch({
      agentId,
      agentDisplayName: plan.name,
      emailSendingMode: planEmailMode,
      existingResendFromEmail: (agent as { resend_from_email?: string | null }).resend_from_email,
    });

    const { error: updateError } = await (admin as any)
      .from('agents')
      .update({
        name: plan.name,
        persona: plan.persona ?? null,
        instructions: plan.instructions ?? '',
        avatar_emoji: plan.avatarEmoji ?? '🤖',
        goals_rules: goalsRules,
        updated_at: new Date().toISOString(),
        ...resendPatch,
      })
      .eq('id', agentId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update agent', details: updateError.message },
        { status: 500 }
      );
    }

    // Create new behaviours
    await createAgentBehaviours(agentId, user.id, plan.behaviours);

    // Recompute status (pending_integrations vs active) based on polling triggers
    const integrations = await getUserIntegrations(user.id);
    const connectedServices = integrations
      .map((i) => i.service_name)
      .filter(Boolean) as string[];
    const pollingRequired = buildIntegrationCheckListForPolling(
      plan,
      connectedServices
    );
    const hasDisconnected = pollingRequired.some((i) => !i.connected);
    const finalStatus = hasDisconnected ? 'pending_integrations' : 'active';

    await (admin as any)
      .from('agents')
      .update({
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)
      .eq('user_id', user.id);

    const { data: updatedAgent } = await (admin as any)
      .from('agents')
      .select()
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      agent: updatedAgent,
      success: true,
    });
  } catch (err: any) {
    console.error('[POST /api/agents/[id]/update-from-plan]', err);
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
