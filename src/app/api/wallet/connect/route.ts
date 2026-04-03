/**
 * API Route: POST /api/wallet/connect
 * Verifies Phantom wallet ownership via signed message and stores the connection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  verifyWalletSignature,
  buildOwnershipMessage,
} from '@/lib/token-gating/verify-signature';
import { walletConnectRateLimit } from '@/lib/rate-limiter';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectLimit = walletConnectRateLimit(user.id);
    if (!connectLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: connectLimit.retryAfter },
        { status: 429 },
      );
    }

    // 2. Parse and validate body
    const body = await request.json().catch(() => ({}));
    const { walletAddress, signature, message, timestamp } = body as {
      walletAddress?: string;
      signature?: string;
      message?: string;
      timestamp?: number;
    };

    if (!walletAddress || !signature || !message || timestamp == null) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, signature, message, timestamp' },
        { status: 400 },
      );
    }

    // 3. Timestamp freshness check (±5 minutes)
    const now = Date.now();
    if (Math.abs(now - timestamp) > FIVE_MINUTES_MS) {
      return NextResponse.json({ error: 'Signature expired' }, { status: 400 });
    }

    // 4. Verify message matches what we expect for this user + timestamp
    const expectedMessage = buildOwnershipMessage(user.id, timestamp);
    if (message !== expectedMessage) {
      return NextResponse.json({ error: 'Message mismatch' }, { status: 400 });
    }

    // 5. Verify the ed25519 signature
    const valid = verifyWalletSignature(walletAddress, message, signature);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 6. Check if wallet is already connected to a different account
    const admin = createAdminClient();
    const { data: existing } = await (admin
      .from('wallet_connections') as any)
      .select('user_id')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (existing && existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Wallet already connected to another account' },
        { status: 409 },
      );
    }

    // 7. Upsert — resetting last_claim_at so accrual starts fresh for this wallet
    const nowIso = new Date(now).toISOString();
    const { error: upsertError } = await (admin
      .from('wallet_connections') as any)
      .upsert(
        {
          user_id: user.id,
          wallet_address: walletAddress,
          chain: 'solana',
          connected_at: nowIso,
          last_claim_at: null,
          is_active: true,
          updated_at: nowIso,
        },
        { onConflict: 'user_id' },
      );

    if (upsertError) {
      console.error('[wallet/connect] upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to save wallet connection' }, { status: 500 });
    }

    // 8. Success
    return NextResponse.json({ success: true, walletAddress });
  } catch (error: any) {
    console.error('[wallet/connect] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
