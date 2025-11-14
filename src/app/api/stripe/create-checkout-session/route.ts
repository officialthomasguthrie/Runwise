import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePricePro = process.env.STRIPE_PRICE_PRO;

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

  const selectedPlan = (body?.plan as string | undefined) ?? 'pro-monthly';
  const explicitPriceId = typeof body?.priceId === 'string' ? body.priceId : null;

  const priceId = explicitPriceId ?? stripePricePro;

  if (!priceId) {
    return NextResponse.json(
      {
        error:
          'Stripe price ID is not configured. Please set STRIPE_PRICE_PRO.',
      },
      { status: 500 },
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      allow_promotion_codes: false,
      customer_email: user?.email ?? undefined,
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
      subscription_data: {
        metadata: {
          plan: selectedPlan,
          initiatedByUserId: user?.id ?? '',
        },
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
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


