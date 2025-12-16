import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePricePro = process.env.STRIPE_PRICE_PRO;
const stripePricePersonal = process.env.STRIPE_PRICE_PERSONAL;
const stripePriceProYearly = process.env.STRIPE_PRICE_PRO_YEARLY;
const stripePricePersonalYearly = process.env.STRIPE_PRICE_PERSONAL_YEARLY;

const stripe = stripeSecretKey != null ? new Stripe(stripeSecretKey) : null;

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

    // Only add trial period if not skipping it (for plan switches from billing settings)
    // Personal plan does not have a free trial
    const isPersonalPlan = selectedPlan.startsWith('personal-');
    if (!skipTrial && !isPersonalPlan) {
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


