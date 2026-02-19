import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import type { Database } from '@/types/database';
type OnboardingRow =
  Database['public']['Tables']['billing_onboarding_sessions']['Row'];


export const dynamic = 'force-dynamic';

function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt).getTime();
  return Number.isNaN(expiry) || expiry < Date.now();
}

export async function POST(request: NextRequest) {
  try {
    const { token, email, firstName, lastName, password } =
      await request.json();

    if (
      !token ||
      typeof token !== 'string' ||
      !email ||
      typeof email !== 'string' ||
      !firstName ||
      typeof firstName !== 'string' ||
      !lastName ||
      typeof lastName !== 'string' ||
      !password ||
      typeof password !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Missing required onboarding data.' },
        { status: 400 },
      );
    }

    // Trim the token to handle any whitespace issues
    const trimmedToken = token.trim();

    const adminSupabase = createAdminClient();

    const { data: onboardingRecord, error: onboardingError } =
      await adminSupabase
        .from('billing_onboarding_sessions')
        .select('*')
        .eq('onboarding_token', trimmedToken)
        .single<OnboardingRow>();

    if (onboardingError) {
      console.error('Onboarding token lookup error:', {
        error: onboardingError,
        tokenPrefix: trimmedToken.substring(0, 8) + '...', // Log partial token for debugging
        code: onboardingError.code,
        message: onboardingError.message,
        details: onboardingError.details,
        hint: onboardingError.hint,
      });
      
      // If it's a "not found" error (PGRST116), provide a more specific message
      if (onboardingError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Invalid or expired onboarding token. The token may have expired or already been used. Please contact support if you believe this is an error.' },
          { status: 400 },
        );
      }
      
      return NextResponse.json(
        { error: 'Invalid or expired onboarding token.' },
        { status: 400 },
      );
    }

    if (!onboardingRecord) {
      console.error('Onboarding token lookup returned no record:', {
        tokenPrefix: trimmedToken.substring(0, 8) + '...',
      });
      return NextResponse.json(
        { error: 'Invalid or expired onboarding token.' },
        { status: 400 },
      );
    }

    if (onboardingRecord.status === 'completed') {
      return NextResponse.json(
        { error: 'This onboarding token has already been used.' },
        { status: 400 },
      );
    }

    if (isTokenExpired(onboardingRecord.onboarding_token_expires_at)) {
      return NextResponse.json(
        { error: 'Onboarding token has expired. Please contact support.' },
        { status: 400 },
      );
    }

    // Assign a random profile picture using the same logic as email/password signup.
    // Hash the email so the same address always gets the same image.
    const profileImages = ['/Profile2.jpg', '/Profile3.jpg', '/Profile4.jpg'];
    const emailHash = email.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const randomAvatar = profileImages[emailHash % profileImages.length];

    const { data: createdUser, error: createUserError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          avatar_url: randomAvatar,
        },
      });

    if (createUserError || !createdUser?.user) {
      console.error('Failed to create Supabase auth user:', createUserError);
      return NextResponse.json(
        {
          error:
            createUserError?.message ??
            'Failed to create user. If you already have an account, please login instead.',
        },
        { status: 500 },
      );
    }

    const userId = createdUser.user.id;
    const now = new Date().toISOString();

    // Determine subscription tier from plan
    const plan = onboardingRecord.metadata?.plan as string | undefined;
    let subscriptionTier = 'professional'; // default
    if (plan?.startsWith('personal')) {
      subscriptionTier = 'personal';
    } else if (plan?.startsWith('pro')) {
      subscriptionTier = 'professional';
    }

    // Get monthly credit allocation for the subscription tier
    const { getMonthlyCreditAllocation } = await import('@/lib/credits/calculator');
    const monthlyCredits = getMonthlyCreditAllocation(subscriptionTier);

    const { error: upsertError } = await (adminSupabase.from('users') as any)
      .upsert({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        subscription_tier: subscriptionTier,
        subscription_status: 'active',
        subscription_started_at: now,
        stripe_customer_id: onboardingRecord.stripe_customer_id,
        stripe_subscription_id: onboardingRecord.stripe_subscription_id,
        credits_balance: monthlyCredits,
        credits_used_this_month: 0,
        credits_last_reset: now,
        total_credits_used: 0,
        updated_at: now,
      });

    if (upsertError) {
      console.error('Failed to upsert user profile:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save user profile.' },
        { status: 500 },
      );
    }

    const { error: onboardingUpdateError } = await (adminSupabase
      .from('billing_onboarding_sessions') as any)
      .update({
        status: 'completed',
        user_id: userId,
        onboarding_token: null,
        onboarding_token_expires_at: null,
        updated_at: now,
      })
      .eq('id', onboardingRecord.id);

    if (onboardingUpdateError) {
      console.error(
        'Failed to update onboarding session:',
        onboardingUpdateError,
      );
      return NextResponse.json(
        { error: 'Failed to finalize onboarding session.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      email,
    });
  } catch (error: any) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to complete onboarding.' },
      { status: 500 },
    );
  }
}


