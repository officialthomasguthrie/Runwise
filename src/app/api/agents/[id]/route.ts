/**
 * GET    /api/agents/[id]  — fetch one agent with behaviours and memory count
 * PATCH  /api/agents/[id]  — update name, persona, instructions, or status
 * DELETE /api/agents/[id]  — delete agent + all behaviours + all memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { deleteAgentBehaviours } from '@/lib/agents/behaviour-manager';

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

    return NextResponse.json({
      agent: {
        ...agent,
        behaviours: behaviours ?? [],
        memory_count: memoryCount ?? 0,
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
    const PATCHABLE = ['name', 'persona', 'instructions', 'status', 'avatar_emoji', 'max_steps'] as const;
    for (const field of PATCHABLE) {
      if (field in body) allowed[field] = body[field];
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No patchable fields provided' }, { status: 400 });
    }

    allowed.updated_at = new Date().toISOString();

    const admin = createAdminClient();

    const { data: agent, error: updateError } = await (admin as any)
      .from('agents')
      .update(allowed)
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
