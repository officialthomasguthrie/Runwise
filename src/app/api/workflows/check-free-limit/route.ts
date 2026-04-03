/**
 * API Route: /api/workflows/check-free-limit
 * Checks if a free user has already generated a workflow
 * Free users can send unlimited messages until they generate their first workflow
 * Once they generate a workflow, has_used_free_action is set to true
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

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
    
    // Get user's subscription tier and free action status
    const { data: userData, error: userError } = await (supabase
      .from('users') as any)
      .select('subscription_tier, has_used_free_action')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.error('Error fetching user subscription:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }
    
    const subscriptionTier = (userData as any)?.subscription_tier || 'free';
    
    // If user is not on free plan, they have no limit
    if (subscriptionTier !== 'free') {
      return NextResponse.json({
        hasReachedLimit: false,
      });
    }
    
    // For free users, check if they've generated a workflow
    // has_used_free_action is true once they generate their first workflow
    const hasUsedFreeAction = (userData as any)?.has_used_free_action || false;

    // If they've used their free action, check whether they have token-holder credits
    // that override the gate — same logic as the generate-workflow API route.
    if (hasUsedFreeAction) {
      try {
        const adminSupabase = createAdminClient();
        const { data: creditsRow } = await (adminSupabase
          .from('users') as any)
          .select('credits_balance')
          .eq('id', user.id)
          .single();

        const creditsBalance: number = (creditsRow as any)?.credits_balance ?? 0;

        if (creditsBalance > 0) {
          // Token-holder credits available — treat as not having reached limit
          return NextResponse.json({ hasReachedLimit: false });
        }
      } catch (creditsError) {
        console.error('Error checking credits in check-free-limit:', creditsError);
        // On error, fall through to the default has_used_free_action gate
      }
    }

    return NextResponse.json({
      hasReachedLimit: hasUsedFreeAction,
    });
  } catch (error: any) {
    console.error('Error in GET /api/workflows/check-free-limit:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

