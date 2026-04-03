/**
 * API Route: GET /api/wallet/status
 * Returns the current wallet connection state and accrued credits.
 * Uses stored token balance — no live RPC call.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  calculateAccruedCredits,
  getCreditsPerDay,
  getMaxUnclaimed,
  getMinimumTokenThresholdRaw,
} from '@/lib/token-gating/credit-engine';
import { formatDisplayBalance } from '@/lib/solana/token-balance';
import { walletStatusRateLimit } from '@/lib/rate-limiter';

export async function GET(_request: NextRequest) {
  try {
    // 1. Authenticate
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

    // 2. Fetch active wallet connection (stored data, no RPC)
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

    // 3. Work with stored balance — convert to bigint for all calculations
    const rawBalance = BigInt(row.token_balance ?? 0);

    // 6. Determine accrual start: last_claim_at if set, otherwise connected_at
    const accrualStartAt = row.last_claim_at
      ? new Date(row.last_claim_at)
      : new Date(row.connected_at);

    // 7. Calculate accrued credits
    const now = new Date();
    const accrual = calculateAccruedCredits(rawBalance, accrualStartAt, now);

    // Derived values
    const minThresholdRaw = getMinimumTokenThresholdRaw();
    const eligible = rawBalance >= minThresholdRaw;
    const creditsPerDay = getCreditsPerDay(rawBalance);
    const maxUnclaimed = getMaxUnclaimed(creditsPerDay);

    // 8. Return full status
    return NextResponse.json({
      connected: true,
      walletAddress: row.wallet_address,
      tokenBalanceRaw: rawBalance.toString(),
      tokenBalanceDisplay: formatDisplayBalance(rawBalance),
      eligible,
      creditsPerDay,
      maxUnclaimed,
      accruedCredits: accrual.accrued,
      accrualStartAt: accrualStartAt.toISOString(),
      cappedAt: accrual.cappedAt,
      balanceLastChecked: row.balance_last_checked ?? null,
      lastClaimAt: row.last_claim_at ?? null,
    });
  } catch (error: any) {
    console.error('[wallet/status] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
