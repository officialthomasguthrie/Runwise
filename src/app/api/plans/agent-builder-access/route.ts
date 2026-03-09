/**
 * GET /api/plans/agent-builder-access
 *
 * Returns whether the authenticated user can access the Agent Builder (Pro plan).
 * Used by the UI to show upgrade prompts before rendering builder content.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { canAccessAgentBuilder } from '@/lib/plans/config';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: userRow, error: userError } = await (admin as any)
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = userError ? 'free' : (userRow?.subscription_tier || 'free');
    const allowed = canAccessAgentBuilder(tier);

    return NextResponse.json({
      allowed,
      tier,
      upgradeUrl: allowed ? null : '/settings?tab=billing',
    });
  } catch (err: any) {
    console.error('[GET /api/plans/agent-builder-access]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
