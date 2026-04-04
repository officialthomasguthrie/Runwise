/**
 * API Route: POST /api/wallet/claim-credits
 * Grants up to the remainder of today's UTC daily allowance in one claim (signature required).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  verifyWalletSignature,
  buildClaimMessage,
} from '@/lib/token-gating/verify-signature';
import {
  getClaimableToday,
  getCreditsPerDay,
  getNextUtcMidnightIso,
  getUtcDayBoundsIso,
} from '@/lib/token-gating/credit-engine';
import { sumCreditsClaimedUtcDay } from '@/lib/token-gating/sum-daily-claims';
import { getRunwiseTokenBalance } from '@/lib/solana/token-balance';
import { walletClaimCreditsRateLimit } from '@/lib/rate-limiter';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const claimLimit = walletClaimCreditsRateLimit(user.id);
    if (!claimLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: claimLimit.retryAfter },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { signature, timestamp } = body as {
      signature?: string;
      timestamp?: number;
    };

    if (!signature || timestamp == null) {
      return NextResponse.json(
        { error: 'Missing required fields: signature, timestamp' },
        { status: 400 },
      );
    }

    const now = new Date();
    const nowMs = now.getTime();

    if (Math.abs(nowMs - timestamp) > FIVE_MINUTES_MS) {
      return NextResponse.json({ error: 'Claim signature expired' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: walletRow, error: walletFetchError } = await (admin
      .from('wallet_connections') as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (walletFetchError) {
      console.error('[claim-credits] wallet fetch error:', walletFetchError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!walletRow) {
      return NextResponse.json({ error: 'No wallet connected' }, { status: 404 });
    }

    const walletAddress: string = walletRow.wallet_address;

    const expectedMessage = buildClaimMessage(user.id, walletAddress, timestamp);
    const valid = verifyWalletSignature(walletAddress, expectedMessage, signature);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const liveBalance = await getRunwiseTokenBalance(walletAddress);

    const nowIso = now.toISOString();
    const { error: balanceUpdateError } = await (admin
      .from('wallet_connections') as any)
      .update({
        token_balance: Number(liveBalance),
        balance_last_checked: nowIso,
        last_verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq('user_id', user.id);

    if (balanceUpdateError) {
      console.error('[claim-credits] balance update error:', balanceUpdateError);
    }

    const creditsPerDay = getCreditsPerDay(liveBalance);
    const { startIso } = getUtcDayBoundsIso(now);

    let claimedToday: number;
    try {
      claimedToday = await sumCreditsClaimedUtcDay(admin, user.id, now);
    } catch (e) {
      console.error('[claim-credits] sum claims error:', e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const claimable = getClaimableToday(creditsPerDay, claimedToday);

    if (claimable < 1) {
      return NextResponse.json(
        {
          error: 'No credits left to claim today',
          creditsPerDay,
          creditsClaimedToday: claimedToday,
          dailyLimitResetsAt: getNextUtcMidnightIso(now),
        },
        { status: 400 },
      );
    }

    const { error: claimInsertError } = await (admin
      .from('token_credit_claims') as any)
      .insert({
        user_id: user.id,
        wallet_address: walletAddress,
        credits_granted: claimable,
        tokens_held_at_claim: Number(liveBalance),
        credits_per_day_at_claim: creditsPerDay,
        accrual_start_at: startIso,
        accrual_hours: 0,
        claimed_at: nowIso,
      });

    if (claimInsertError) {
      console.error('[claim-credits] claim insert error:', claimInsertError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const { error: claimAtUpdateError } = await (admin
      .from('wallet_connections') as any)
      .update({ last_claim_at: nowIso, updated_at: nowIso })
      .eq('user_id', user.id);

    if (claimAtUpdateError) {
      console.error('[claim-credits] last_claim_at update error:', claimAtUpdateError);
    }

    const { data: userRow, error: userFetchError } = await (admin
      .from('users') as any)
      .select('credits_balance')
      .eq('id', user.id)
      .single();

    if (userFetchError || !userRow) {
      console.error('[claim-credits] user fetch error:', userFetchError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const newBalance = (userRow.credits_balance ?? 0) + claimable;

    const { error: balCreditError } = await (admin
      .from('users') as any)
      .update({ credits_balance: newBalance, updated_at: nowIso })
      .eq('id', user.id);

    if (balCreditError) {
      console.error('[claim-credits] credits_balance update error:', balCreditError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const newClaimedToday = claimedToday + claimable;

    return NextResponse.json({
      success: true,
      creditsGranted: claimable,
      creditsPerDay,
      creditsClaimedToday: newClaimedToday,
      newCreditsBalance: newBalance,
      dailyLimitResetsAt: getNextUtcMidnightIso(now),
    });
  } catch (error: any) {
    console.error('[claim-credits] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
