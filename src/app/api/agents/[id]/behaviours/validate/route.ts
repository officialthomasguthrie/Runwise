/**
 * POST /api/agents/[id]/behaviours/validate
 *
 * Validates behaviour config (Form ID exists, Slack channel accessible, etc.).
 * Body: { behaviourId?: string } — if omitted, validates all polling behaviours.
 * Returns: { valid: boolean; results: Array<{ behaviourId, triggerType, valid, error? }> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { validateBehaviourConfig } from '@/lib/agents/config-validator';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: agentId } = await context.params;

    let body: { behaviourId?: string; config?: Record<string, any> } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const admin = createAdminClient();

    let query = (admin as any)
      .from('agent_behaviours')
      .select('id, trigger_type, config')
      .eq('agent_id', agentId)
      .eq('user_id', user.id)
      .eq('behaviour_type', 'polling');

    if (body.behaviourId) {
      query = query.eq('id', body.behaviourId);
    }

    const { data: behaviours, error: fetchError } = await query;

    if (fetchError || !behaviours?.length) {
      return NextResponse.json(
        { valid: true, results: [] },
        { status: 200 }
      );
    }

    const results: Array<{
      behaviourId: string;
      triggerType: string;
      valid: boolean;
      error?: string;
    }> = [];

    for (const b of behaviours) {
      if (!b.trigger_type) {
        results.push({ behaviourId: b.id, triggerType: '', valid: true });
        continue;
      }
      const configToUse = body.behaviourId && body.behaviourId === b.id && body.config
        ? body.config
        : (b.config ?? {});
      const result = await validateBehaviourConfig(user.id, b.trigger_type, configToUse);
      results.push({
        behaviourId: b.id,
        triggerType: b.trigger_type,
        valid: result.valid,
        error: result.error,
      });
    }

    const allValid = results.every((r) => r.valid);

    return NextResponse.json({
      valid: allValid,
      results,
    });
  } catch (err: any) {
    console.error('[POST /api/agents/[id]/behaviours/validate]', err);
    return NextResponse.json(
      { error: err?.message ?? 'Validation failed' },
      { status: 500 }
    );
  }
}
