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

    const adminSupabase = createAdminClient();

    const { data: onboardingRecord, error: onboardingError } =
      await adminSupabase
        .from('billing_onboarding_sessions')
        .select('*')
        .eq('onboarding_token', token)
        .single<OnboardingRow>();

    if (onboardingError || !onboardingRecord) {
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

    const { data: createdUser, error: createUserError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
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

    const { error: upsertError } = await (adminSupabase.from('users') as any)
      .upsert({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_started_at: now,
        stripe_customer_id: onboardingRecord.stripe_customer_id,
        stripe_subscription_id: onboardingRecord.stripe_subscription_id,
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


