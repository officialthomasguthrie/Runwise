import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePricePro = process.env.STRIPE_PRICE_PRO;
const stripePricePersonal = process.env.STRIPE_PRICE_PERSONAL;
const stripePriceProYearly = process.env.STRIPE_PRICE_PRO_YEARLY;
const stripePricePersonalYearly = process.env.STRIPE_PRICE_PERSONAL_YEARLY;

const stripe = stripeSecretKey != null ? new Stripe(stripeSecretKey) : null;

/**
 * Check if a user/email/payment method is eligible for a free trial
 */
async function checkTrialEligibility(
  userId: string | null,
  email: string | null,
  stripe: Stripe
): Promise<{ eligible: boolean; reason?: string }> {
  const adminSupabase = createAdminClient();

  // Check 1: If user is logged in, check if they've used a trial before in our database
  if (userId) {
    // Check if the user has ever had a paid subscription (including cancelled ones)
    const { data: userRecord } = await adminSupabase
      .from('users')
      .select('stripe_customer_id, subscription_status')
      .eq('id', userId)
      .maybeSingle();

    if (userRecord && (userRecord as any).subscription_status === 'cancelled') {
      return {
        eligible: false,
        reason: 'Your account previously had a subscription. You can purchase a plan directly without a trial.',
      };
    }

    const { data: existingTrial, error } = await adminSupabase
      .from('trial_usage')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking trial usage:', error);
      // Don't block on database errors, but log them
    } else if (existingTrial) {
      return { eligible: false, reason: 'You have already used a free trial on this account' };
    }

    // Also check if user has a Stripe customer with trial history
    const { data: user } = await adminSupabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    const stripeCustomerId = user && 'stripe_customer_id' in user ? (user as { stripe_customer_id: string | null }).stripe_customer_id : null;
    if (stripeCustomerId) {
      try {
        // Check Stripe customer's subscription history
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'all',
          limit: 100,
        });

        // Check if any subscription had a trial period
        const hasUsedTrial = subscriptions.data.some(sub => 
          sub.status === 'trialing' || 
          (sub.trial_start && sub.trial_end)
        );

        if (hasUsedTrial) {
          return { eligible: false, reason: 'This account has already used a free trial' };
        }

        // Check customer metadata
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        if (!customer.deleted && 'metadata' in customer && customer.metadata?.used_trial === 'true') {
          return { eligible: false, reason: 'This account has already used a free trial' };
        }
      } catch (error) {
        console.error('Error checking Stripe customer history:', error);
        // Continue if Stripe check fails
      }
    }
  }

  // Check 2: If email provided, check for existing customer with same email
  if (email) {
    try {
      const customers = await stripe.customers.list({
        email: email,
        limit: 10, // Check multiple customers with same email
      });

      for (const customer of customers.data) {
        // Check customer metadata
        if (customer.metadata?.used_trial === 'true') {
          return { eligible: false, reason: 'This email has already been used for a free trial' };
        }

        // Check subscription history for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'all',
          limit: 100,
        });

        const hasUsedTrial = subscriptions.data.some(sub => 
          sub.status === 'trialing' || 
          (sub.trial_start && sub.trial_end)
        );

        if (hasUsedTrial) {
          return { eligible: false, reason: 'This email has already been used for a free trial' };
        }

        // Check if customer ID exists in our trial_usage table
        const { data: existingTrialByCustomer } = await adminSupabase
          .from('trial_usage')
          .select('id')
          .eq('stripe_customer_id', customer.id)
          .limit(1)
          .maybeSingle();

        if (existingTrialByCustomer) {
          return { eligible: false, reason: 'This email has already been used for a free trial' };
        }
      }
    } catch (error) {
      console.error('Error checking Stripe email history:', error);
      // Continue if Stripe check fails
    }

    // Also check our database for trials by email (if we stored email)
    // We'll check Stripe customers directly instead of iterating through all trial records
    // This is more efficient and avoids type issues
  }

  return { eligible: true };
}

export async function POST(request: NextRequest) {
  if (!stripe || !stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY.' },
      { status: 500 },
    );
  }

  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000';

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const requestedPlan = (body?.plan as string | undefined) ?? 'pro-monthly';
  const explicitPriceId = typeof body?.priceId === 'string' ? body.priceId : null;
  const skipTrial = body?.skipTrial === true;
  const explicitTrialDays = typeof body?.trialDays === 'number' ? body.trialDays : null;
  const customCancelUrl = typeof body?.cancelUrl === 'string' ? body.cancelUrl : null;

  const planPriceMap: Record<string, string | undefined> = {
    'pro-monthly': stripePricePro,
    'personal-monthly': stripePricePersonal,
    'pro-yearly': stripePriceProYearly,
    'personal-yearly': stripePricePersonalYearly,
  };

  const selectedPlan =
    requestedPlan in planPriceMap ? requestedPlan : 'pro-monthly';

  const priceId = explicitPriceId ?? planPriceMap[selectedPlan];

  if (!priceId) {
    const envNameMap: Record<string, string> = {
      'personal-monthly': 'STRIPE_PRICE_PERSONAL',
      'personal-yearly': 'STRIPE_PRICE_PERSONAL_YEARLY',
      'pro-monthly': 'STRIPE_PRICE_PRO',
      'pro-yearly': 'STRIPE_PRICE_PRO_YEARLY',
    };
    const envName = envNameMap[selectedPlan] || 'STRIPE_PRICE_PRO';

    return NextResponse.json(
      {
        error: `Stripe price ID is not configured for ${selectedPlan}. Please set ${envName}.`,
      },
      { status: 500 },
    );
  }

  try {
    // Try to get user if authenticated, but don't require it
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null }));

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: {
        plan: selectedPlan,
        initiatedByUserId: user?.id ?? '',
      },
    };

    // Add trial period if:
    // 1. Explicit trialDays is provided (e.g., from "Start Free Trial" button)
    // 2. OR if not explicitly skipping it AND user is NOT logged in AND it's not a personal plan (legacy behavior)
    const isPersonalPlan = selectedPlan.startsWith('personal-');
    const isLoggedInUser = user !== null;
    
    if (explicitTrialDays !== null && explicitTrialDays > 0) {
      // Explicit trial days provided - check eligibility first
      const eligibility = await checkTrialEligibility(
        user?.id ?? null,
        user?.email ?? body?.email ?? null,
        stripe
      );

      if (!eligibility.eligible) {
        return NextResponse.json(
          { error: eligibility.reason || 'You are not eligible for a free trial. Each account and email address can only use one free trial.' },
          { status: 400 }
        );
      }
      
      subscriptionData.trial_period_days = explicitTrialDays;
    } else if (!skipTrial && !isPersonalPlan && !isLoggedInUser) {
      // Legacy behavior: new signups get trial, existing users switching plans don't
      // Still check eligibility for new signups
      const eligibility = await checkTrialEligibility(
        null,
        body?.email ?? null,
        stripe
      );

      if (!eligibility.eligible) {
        return NextResponse.json(
          { error: eligibility.reason || 'You are not eligible for a free trial. Each email address can only use one free trial.' },
          { status: 400 }
        );
      }
      
      subscriptionData.trial_period_days = 7;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      allow_promotion_codes: false,
      customer_email: user?.email ?? body?.email ?? undefined,
      client_reference_id: user?.id ?? undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        plan: selectedPlan,
        initiatedByUserId: user?.id ?? '',
      },
      subscription_data: subscriptionData,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: customCancelUrl ? `${origin}${customCancelUrl}` : `${origin}/#pricing`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Unable to create checkout session.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating Stripe checkout session:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to create checkout session.' },
      { status: 500 },
    );
  }
}


