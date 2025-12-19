/**
 * API Route: /api/workflows/check-free-limit
 * Checks if a free user has already generated a workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

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
    
    // Get user's subscription tier
    const { data: userData, error: userError } = await (supabase
      .from('users') as any)
      .select('subscription_tier')
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
        workflowCount: 0,
      });
    }
    
    // Count AI-generated workflows for this user
    const { count, error: countError } = await supabase
      .from('workflows')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('ai_generated', true);
    
    if (countError) {
      console.error('Error counting workflows:', countError);
      return NextResponse.json(
        { error: 'Failed to count workflows' },
        { status: 500 }
      );
    }
    
    const workflowCount = count || 0;
    const hasReachedLimit = workflowCount >= 1;
    
    return NextResponse.json({
      hasReachedLimit,
      workflowCount,
    });
  } catch (error: any) {
    console.error('Error in GET /api/workflows/check-free-limit:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

