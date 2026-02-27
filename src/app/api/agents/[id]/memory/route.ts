/**
 * GET    /api/agents/[id]/memory            — list all memories for an agent
 * POST   /api/agents/[id]/memory            — manually add a memory
 * DELETE /api/agents/[id]/memory?memoryId=x — delete a specific memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { writeMemory, deleteMemory } from '@/lib/agents/memory';
import type { AgentMemoryType } from '@/lib/agents/types';

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

    // Verify ownership
    const { data: agent, error: agentError } = await (admin as any)
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const { data: memories, error: memError } = await (admin as any)
      .from('agent_memory')
      .select('*')
      .eq('agent_id', id)
      .eq('user_id', user.id)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false });

    if (memError) {
      return NextResponse.json({ error: memError.message }, { status: 500 });
    }

    return NextResponse.json({ memories: memories ?? [] });
  } catch (err: any) {
    console.error('[GET /api/agents/[id]/memory]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    let body: { content: string; memory_type?: AgentMemoryType; importance?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify ownership
    const { data: agent, error: agentError } = await (admin as any)
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const memory = await writeMemory(
      id,
      user.id,
      body.content.trim(),
      body.memory_type ?? 'fact',
      body.importance ?? 5,
      'user'
    );

    return NextResponse.json({ memory }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/agents/[id]/memory]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get('memoryId');

    if (!memoryId) {
      return NextResponse.json({ error: 'memoryId query param is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify the memory belongs to this agent and user before deleting
    const { data: mem, error: memLookupError } = await (admin as any)
      .from('agent_memory')
      .select('id')
      .eq('id', memoryId)
      .eq('agent_id', id)
      .eq('user_id', user.id)
      .single();

    if (memLookupError || !mem) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    await deleteMemory(memoryId, user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/agents/[id]/memory]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
