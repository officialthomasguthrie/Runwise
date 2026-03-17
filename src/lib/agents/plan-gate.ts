/**
 * Agent Builder plan gate — ensures only Pro users can access agent builder features.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { canAccessAgentBuilder } from '@/lib/plans/config';

/** Standard 403 payload when agent builder access is denied */
const FORBIDDEN_RESPONSE = NextResponse.json(
  {
    error: 'Agent Builder is available on the Pro plan',
    code: 'AGENT_BUILDER_PRO_REQUIRED',
    upgradeUrl: '/settings?tab=billing',
  },
  { status: 403 }
);

/**
 * Check if the authenticated user can access the Agent Builder.
 * Returns null if allowed, or a NextResponse to return (403) if not.
 */
export async function requireAgentBuilderAccess(userId: string): Promise<NextResponse | null> {
  const admin = createAdminClient();
  const { data: user, error } = await (admin as any)
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const tier = (user as any)?.subscription_tier || 'free';
  if (!canAccessAgentBuilder(tier)) {
    return FORBIDDEN_RESPONSE;
  }

  return null;
}
