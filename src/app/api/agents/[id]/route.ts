/**
 * GET    /api/agents/[id]  — fetch one agent with behaviours and memory count
 * PATCH  /api/agents/[id]  — update name, persona, instructions, or status
 * DELETE /api/agents/[id]  — delete agent + all behaviours + all memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { deleteAgentBehaviours } from '@/lib/agents/behaviour-manager';
import { deriveAgentCapabilities } from '@/lib/agents/chat-pipeline';
import {
  getAgentResendProvisionPatch,
  parseAgentEmailSendingMode,
} from '@/lib/agents/resend-provision';

type RouteContext = { params: Promise<{ id: string }> };

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const admin = createAdminClient();

    const { data: agent, error: agentError } = await (admin as any)
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Load behaviours
    const { data: behaviours } = await (admin as any)
      .from('agent_behaviours')
      .select('*')
      .eq('agent_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    // Count memories
    const { count: memoryCount } = await (admin as any)
      .from('agent_memory')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', id)
      .eq('user_id', user.id);

    // Fetch memories (AI-generated + user-added) for Knowledge & Memory section
    const { data: memories } = await (admin as any)
      .from('agent_memory')
      .select('id, content, memory_type')
      .eq('agent_id', id)
      .eq('user_id', user.id)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false });

    // Derive capabilities (integrations/tools) from behaviours + instructions
    const capabilities = deriveAgentCapabilities({
      instructions: agent.instructions,
      persona: agent.persona,
      behaviours: behaviours ?? [],
    });

    return NextResponse.json({
      agent: {
        ...agent,
        behaviours: behaviours ?? [],
        memory_count: memoryCount ?? 0,
        memories: memories ?? [],
        capabilities,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/agents/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    let body: Record<string, any>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Only allow safe fields to be updated
    const allowed: Record<string, any> = {};
    const PATCHABLE = [
      'name',
      'persona',
      'instructions',
      'status',
      'avatar_emoji',
      'max_steps',
      'goals_rules',
      'email_sending_mode',
    ] as const;
    for (const field of PATCHABLE) {
      if (field in body) {
        if (field === 'goals_rules') {
          if (Array.isArray(body[field])) {
            allowed[field] = body[field]
              .filter((g: any) => g && typeof g.label === 'string' && g.label.trim())
              .map((g: any, i: number) => ({
                id: g.id || `gr-${Date.now()}-${i}`,
                type: ['goal', 'rule'].includes(g.type) ? g.type : 'goal',
                label: g.label.trim(),
              }));
          }
        } else if (field === 'email_sending_mode') {
          const parsed = parseAgentEmailSendingMode(body[field]);
          if (!parsed) {
            return NextResponse.json(
              { error: 'Invalid email_sending_mode' },
              { status: 400 }
            );
          }
          allowed[field] = parsed;
        } else {
          allowed[field] = body[field];
        }
      }
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No patchable fields provided' }, { status: 400 });
    }

    allowed.updated_at = new Date().toISOString();

    const admin = createAdminClient();

    let updatePayload = allowed;
    if ('email_sending_mode' in allowed) {
      const { data: prior, error: priorError } = await (admin as any)
        .from('agents')
        .select('resend_from_email, name')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (priorError || !prior) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      const displayName =
        typeof allowed.name === 'string' && allowed.name.trim()
          ? allowed.name.trim()
          : (prior.name as string) || 'Agent';

      const resendPatch = getAgentResendProvisionPatch({
        agentId: id,
        agentDisplayName: displayName,
        emailSendingMode: allowed.email_sending_mode,
        existingResendFromEmail: prior.resend_from_email,
      });

      updatePayload = { ...allowed, ...resendPatch };
    }

    const { data: agent, error: updateError } = await (admin as any)
      .from('agents')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !agent) {
      return NextResponse.json(
        { error: 'Failed to update agent', details: updateError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ agent });
  } catch (err: any) {
    console.error('[PATCH /api/agents/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const admin = createAdminClient();

    // Verify ownership before deleting
    const { data: agent, error: lookupError } = await (admin as any)
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (lookupError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete behaviours + polling triggers
    await deleteAgentBehaviours(id, user.id);

    // Delete memories
    await (admin as any)
      .from('agent_memory')
      .delete()
      .eq('agent_id', id)
      .eq('user_id', user.id);

    // Delete activity log
    await (admin as any)
      .from('agent_activity')
      .delete()
      .eq('agent_id', id)
      .eq('user_id', user.id);

    // Delete the agent itself
    const { error: deleteError } = await (admin as any)
      .from('agents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete agent', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/agents/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
