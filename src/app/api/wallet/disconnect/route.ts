/**
 * API Route: POST /api/wallet/disconnect
 * Soft-deletes the user's active wallet connection.
 * Previously claimed credits are retained. Accrual stops immediately.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(_request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();
    const admin = createAdminClient();

    // 2. Soft-delete active wallet row
    const { data, error } = await (admin
      .from('wallet_connections') as any)
      .update({ is_active: false, updated_at: now })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select('id');

    if (error) {
      console.error('[wallet-disconnect] update error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // 3. Return 404 if no active wallet existed for this user
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No active wallet found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[wallet-disconnect] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
