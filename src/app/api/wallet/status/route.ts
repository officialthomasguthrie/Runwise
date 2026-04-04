/**
 * API Route: GET /api/wallet/status
 * Returns wallet connection and today's token-credit allowance (UTC day).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  getClaimableToday,
  getCreditsPerDay,
  getMinimumTokenThresholdRaw,
  getNextUtcMidnightIso,
} from '@/lib/token-gating/credit-engine';
import { sumCreditsClaimedUtcDay } from '@/lib/token-gating/sum-daily-claims';
import { formatDisplayBalance } from '@/lib/solana/token-balance';
import { walletStatusRateLimit } from '@/lib/rate-limiter';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statusLimit = walletStatusRateLimit(user.id);
    if (!statusLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: statusLimit.retryAfter },
        { status: 429 },
      );
    }

    const admin = createAdminClient();
    const { data: row, error: fetchError } = await (admin
      .from('wallet_connections') as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (fetchError) {
      console.error('[wallet/status] fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch wallet status' }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ connected: false });
    }

    const rawBalance = BigInt(row.token_balance ?? 0);
    const now = new Date();
    const minThresholdRaw = getMinimumTokenThresholdRaw();
    const eligible = rawBalance >= minThresholdRaw;
    const creditsPerDay = getCreditsPerDay(rawBalance);

    let creditsClaimedToday = 0;
    try {
      creditsClaimedToday = await sumCreditsClaimedUtcDay(admin, user.id, now);
    } catch {
      return NextResponse.json({ error: 'Failed to load claim history' }, { status: 500 });
    }

    const claimableCredits = getClaimableToday(creditsPerDay, creditsClaimedToday);

    return NextResponse.json({
      connected: true,
      walletAddress: row.wallet_address,
      tokenBalanceRaw: rawBalance.toString(),
      tokenBalanceDisplay: formatDisplayBalance(rawBalance),
      eligible,
      creditsPerDay,
      creditsClaimedToday,
      claimableCredits,
      dailyLimitResetsAt: getNextUtcMidnightIso(now),
      balanceLastChecked: row.balance_last_checked ?? null,
      lastClaimAt: row.last_claim_at ?? null,
    });
  } catch (error: any) {
    console.error('[wallet/status] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
