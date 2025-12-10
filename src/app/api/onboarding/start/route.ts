import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import type { Database } from '@/types/database';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

type OnboardingRow =
  Database['public']['Tables']['billing_onboarding_sessions']['Row'];

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing Stripe checkout session id.' },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();

    const { data: onboardingRecord, error } = await adminSupabase
      .from('billing_onboarding_sessions')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .single<OnboardingRow>();

    if (error || !onboardingRecord) {
      return NextResponse.json(
        { error: 'Unable to find onboarding session for this checkout.' },
        { status: 404 },
      );
    }

    if (onboardingRecord.status === 'completed') {
      return NextResponse.json(
        { error: 'This checkout session has already been completed.' },
        { status: 400 },
      );
    }

    const now = Date.now();
    const existingToken = onboardingRecord.onboarding_token;
    const existingExpiry = onboardingRecord.onboarding_token_expires_at
      ? new Date(onboardingRecord.onboarding_token_expires_at).getTime()
      : 0;

    let token = existingToken ?? randomUUID();
    let expiresAt =
      existingExpiry > now ? existingExpiry : now + TOKEN_TTL_MS;

    // If existing token expired, generate a new one.
    if (existingExpiry <= now) {
      token = randomUUID();
      expiresAt = now + TOKEN_TTL_MS;
    }

    const { data: updatedRecord, error: updateError } = await (adminSupabase
      .from('billing_onboarding_sessions') as any)
      .update({
        onboarding_token: token,
        onboarding_token_expires_at: new Date(expiresAt).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', onboardingRecord.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update onboarding token:', {
        error: updateError,
        onboardingRecordId: onboardingRecord.id,
        token: token.substring(0, 8) + '...',
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });
      return NextResponse.json(
        { error: 'Failed to refresh onboarding token.' },
        { status: 500 },
      );
    }

    // Verify the token was actually saved
    if (!updatedRecord || updatedRecord.onboarding_token !== token) {
      console.error('Token update verification failed:', {
        updatedRecordToken: updatedRecord?.onboarding_token?.substring(0, 8) + '...',
        expectedToken: token.substring(0, 8) + '...',
        onboardingRecordId: onboardingRecord.id,
      });
      return NextResponse.json(
        { error: 'Failed to save onboarding token. Please try again.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      token,
      email: onboardingRecord.email,
      expiresAt: new Date(expiresAt).toISOString(),
      plan: onboardingRecord.metadata?.plan ?? 'pro-monthly',
    });
  } catch (error: any) {
    console.error('Error starting onboarding:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to start onboarding.' },
      { status: 500 },
    );
  }
}


