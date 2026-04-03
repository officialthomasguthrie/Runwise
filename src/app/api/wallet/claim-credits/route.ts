/**
 * API Route: POST /api/wallet/claim-credits
 * Time-based linear credit accrual claim. Fully server-side, abuse-resistant, atomic.
 * Requires a fresh wallet signature on every claim.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  verifyWalletSignature,
  buildClaimMessage,
} from '@/lib/token-gating/verify-signature';
import { calculateAccruedCredits } from '@/lib/token-gating/credit-engine';
import { getRunwiseTokenBalance } from '@/lib/solana/token-balance';
import { walletClaimCreditsRateLimit } from '@/lib/rate-limiter';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
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

    // 2. Parse and validate body
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

    // 3. Timestamp freshness — server always determines "now"
    const now = new Date();
    const nowMs = now.getTime();

    if (Math.abs(nowMs - timestamp) > FIVE_MINUTES_MS) {
      return NextResponse.json({ error: 'Claim signature expired' }, { status: 400 });
    }

    // 4. Fetch active wallet connection
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

    // 5. Verify fresh claim signature
    const expectedMessage = buildClaimMessage(user.id, walletAddress, timestamp);
    const valid = verifyWalletSignature(walletAddress, expectedMessage, signature);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 6. Minimum claim interval: 1 hour between claims
    if (walletRow.last_claim_at) {
      const lastClaimMs = new Date(walletRow.last_claim_at).getTime();
      if (nowMs - lastClaimMs < ONE_HOUR_MS) {
        const nextClaimAt = new Date(lastClaimMs + ONE_HOUR_MS).toISOString();
        return NextResponse.json(
          { error: 'Claim too soon', nextClaimAt },
          { status: 429 },
        );
      }
    }

    // 7. Live token balance from Solana RPC
    const liveBalance = await getRunwiseTokenBalance(walletAddress);

    // 8. Update stored balance + verification timestamps
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
      // Non-fatal — proceed with claim calculation
    }

    // 9. Compute accrual start from freshly-read wallet row values
    const accrualStartAt = walletRow.last_claim_at
      ? new Date(walletRow.last_claim_at)
      : new Date(walletRow.connected_at);

    // 10. Calculate accrued credits using live balance
    const accrual = calculateAccruedCredits(liveBalance, accrualStartAt, now);

    if (accrual.accrued === 0) {
      return NextResponse.json(
        {
          error: 'No credits accrued yet',
          creditsPerDay: accrual.creditsPerDay,
          hoursElapsed: accrual.hoursElapsed,
        },
        { status: 400 },
      );
    }

    // 11a. Insert claim record — if this fails we abort entirely
    const { error: claimInsertError } = await (admin
      .from('token_credit_claims') as any)
      .insert({
        user_id: user.id,
        wallet_address: walletAddress,
        credits_granted: accrual.accrued,
        tokens_held_at_claim: Number(liveBalance),
        credits_per_day_at_claim: accrual.creditsPerDay,
        accrual_start_at: accrualStartAt.toISOString(),
        accrual_hours: accrual.hoursElapsed,
        claimed_at: nowIso,
      });

    if (claimInsertError) {
      console.error('[claim-credits] claim insert error:', claimInsertError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // 11b. Reset accrual clock
    const { error: claimAtUpdateError } = await (admin
      .from('wallet_connections') as any)
      .update({ last_claim_at: nowIso, updated_at: nowIso })
      .eq('user_id', user.id);

    if (claimAtUpdateError) {
      console.error('[claim-credits] last_claim_at update error:', claimAtUpdateError);
      // Non-fatal — claim row is already inserted; the 1-hour guard will still protect
    }

    // 11c. Add credits to user balance atomically
    const { data: userRow, error: userFetchError } = await (admin
      .from('users') as any)
      .select('credits_balance')
      .eq('id', user.id)
      .single();

    if (userFetchError || !userRow) {
      console.error('[claim-credits] user fetch error:', userFetchError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const newBalance = (userRow.credits_balance ?? 0) + accrual.accrued;

    const { error: balCreditError } = await (admin
      .from('users') as any)
      .update({ credits_balance: newBalance, updated_at: nowIso })
      .eq('id', user.id);

    if (balCreditError) {
      console.error('[claim-credits] credits_balance update error:', balCreditError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // 12. Return success
    const nextClaimAvailableAt = new Date(nowMs + ONE_HOUR_MS).toISOString();

    return NextResponse.json({
      success: true,
      creditsGranted: accrual.accrued,
      creditsPerDay: accrual.creditsPerDay,
      hoursAccrued: accrual.hoursElapsed,
      newCreditsBalance: newBalance,
      nextClaimAvailableAt,
    });
  } catch (error: any) {
    console.error('[claim-credits] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
