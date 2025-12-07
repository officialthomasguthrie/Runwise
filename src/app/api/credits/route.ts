/**
 * API Route: /api/credits
 * Handles credit balance queries and operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCreditBalance, resetMonthlyCredits } from '@/lib/credits/tracker';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get credit balance
    const balance = await getCreditBalance(user.id);

    if (!balance) {
      return NextResponse.json(
        { error: 'Unable to fetch credit balance' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      balance,
    });
  } catch (error: any) {
    console.error('Error fetching credit balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit balance' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credits - Reset monthly credits (admin or scheduled job)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action === 'reset') {
      // Check if reset is needed (monthly reset)
      const balance = await getCreditBalance(user.id);
      if (!balance) {
        return NextResponse.json(
          { error: 'Unable to fetch credit balance' },
          { status: 500 }
        );
      }

      const now = new Date();
      const nextReset = new Date(balance.nextReset);
      
      // Only allow reset if it's time (or admin override)
      if (now < nextReset && !body.force) {
        return NextResponse.json(
          { error: 'Credit reset not yet due' },
          { status: 400 }
        );
      }

      const success = await resetMonthlyCredits(user.id);
      
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to reset credits' },
          { status: 500 }
        );
      }

      const newBalance = await getCreditBalance(user.id);
      
      return NextResponse.json({
        success: true,
        balance: newBalance,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/credits:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}


