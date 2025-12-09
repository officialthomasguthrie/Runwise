import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to create a fake checkout session for UI testing
 * Usage: POST /api/test/checkout with optional body: { plan: 'personal-monthly' | 'professional-monthly' | 'personal-yearly' | 'professional-yearly', email?: string }
 * Returns: { url: string } - URL to redirect to checkout success page
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const plan = (body?.plan as string) || 'personal-monthly';
    const email = (body?.email as string) || null;

    // Generate a fake Stripe session ID
    const fakeSessionId = `test_session_${randomUUID()}`;
    const fakeCustomerId = `test_customer_${randomUUID()}`;
    const fakeSubscriptionId = `test_sub_${randomUUID()}`;
    const fakePriceId = `test_price_${randomUUID()}`;

    const adminSupabase = createAdminClient();

    // Create a fake onboarding session in the database
    const { data: onboardingSession, error } = await (adminSupabase
      .from('billing_onboarding_sessions') as any)
      .insert({
        stripe_checkout_session_id: fakeSessionId,
        stripe_customer_id: fakeCustomerId,
        stripe_subscription_id: fakeSubscriptionId,
        stripe_price_id: fakePriceId,
        email: email,
        status: 'pending',
        metadata: {
          plan: plan,
          test: true, // Mark as test session
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating test onboarding session:', error);
      return NextResponse.json(
        { error: 'Failed to create test checkout session.' },
        { status: 500 },
      );
    }

    // Get the origin URL
    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3000';

    // Return the success page URL with the fake session ID
    const successUrl = `${origin}/checkout/success?session_id=${fakeSessionId}`;

    return NextResponse.json({
      url: successUrl,
      sessionId: fakeSessionId,
      message: 'Test checkout session created. Use the URL to test the onboarding UI.',
    });
  } catch (error: any) {
    console.error('Error creating test checkout session:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to create test checkout session.' },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint for easy testing - just visit /api/test/checkout?plan=personal-monthly
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const plan = searchParams.get('plan') || 'personal-monthly';
  const email = searchParams.get('email');

  try {
    // Generate a fake Stripe session ID
    const fakeSessionId = `test_session_${randomUUID()}`;
    const fakeCustomerId = `test_customer_${randomUUID()}`;
    const fakeSubscriptionId = `test_sub_${randomUUID()}`;
    const fakePriceId = `test_price_${randomUUID()}`;

    const adminSupabase = createAdminClient();

    // Create a fake onboarding session in the database
    const { data: onboardingSession, error } = await (adminSupabase
      .from('billing_onboarding_sessions') as any)
      .insert({
        stripe_checkout_session_id: fakeSessionId,
        stripe_customer_id: fakeCustomerId,
        stripe_subscription_id: fakeSubscriptionId,
        stripe_price_id: fakePriceId,
        email: email || null,
        status: 'pending',
        metadata: {
          plan: plan,
          test: true, // Mark as test session
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating test onboarding session:', error);
      return NextResponse.json(
        { error: 'Failed to create test checkout session.' },
        { status: 500 },
      );
    }

    // Get the origin URL
    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3000';

    // Redirect directly to the success page
    const successUrl = `${origin}/checkout/success?session_id=${fakeSessionId}`;
    
    return NextResponse.redirect(successUrl);
  } catch (error: any) {
    console.error('Error creating test checkout session:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to create test checkout session.' },
      { status: 500 },
    );
  }
}

