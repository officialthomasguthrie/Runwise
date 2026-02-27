/**
 * GET /api/agents/[id]/activity
 *
 * Returns the paginated activity log for an agent.
 * Supports cursor-based pagination via ?cursor=<ISO timestamp>
 * Default page size: 50.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor'); // ISO timestamp — fetch entries older than this
    const limitParam = parseInt(searchParams.get('limit') ?? '50', 10);
    const limit = Math.min(Math.max(limitParam, 1), 100);

    const admin = createAdminClient();

    // Verify the agent belongs to this user
    const { data: agent, error: agentError } = await (admin as any)
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build query — most recent first, cursor-paginated
    let query = (admin as any)
      .from('agent_activity')
      .select('*')
      .eq('agent_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // fetch one extra to determine if there's a next page

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: rows, error: activityError } = await query;

    if (activityError) {
      return NextResponse.json({ error: activityError.message }, { status: 500 });
    }

    const items = rows ?? [];
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? page[page.length - 1].created_at : null;

    return NextResponse.json({
      activity: page,
      hasMore,
      nextCursor,
    });
  } catch (err: any) {
    console.error('[GET /api/agents/[id]/activity]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
