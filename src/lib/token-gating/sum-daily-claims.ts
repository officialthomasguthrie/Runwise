/**
 * Sum credits granted from token_credit_claims for the current UTC calendar day.
 */

import { getUtcDayBoundsIso } from '@/lib/token-gating/credit-engine';

export async function sumCreditsClaimedUtcDay(
  admin: { from: (t: string) => any },
  userId: string,
  now: Date,
): Promise<number> {
  const { startIso, endIso } = getUtcDayBoundsIso(now);
  const { data, error } = await admin
    .from('token_credit_claims')
    .select('credits_granted')
    .eq('user_id', userId)
    .gte('claimed_at', startIso)
    .lt('claimed_at', endIso);

  if (error) {
    console.error('[sumCreditsClaimedUtcDay]', error);
    throw error;
  }

  return (data ?? []).reduce(
    (s: number, r: { credits_granted: number }) => s + (Number(r.credits_granted) || 0),
    0,
  );
}
