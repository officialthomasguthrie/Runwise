import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey != null ? new Stripe(stripeSecretKey) : null;

export async function POST(request: Request) {
  if (!stripe || !stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Missing STRIPE_SECRET_KEY.' },
      { status: 500 },
    );
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook secret is not configured.' },
      { status: 500 },
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature header.' },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error: any) {
    console.error('Stripe webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerId =
          typeof session.customer === 'string' ? session.customer : null;
        if (!customerId) {
          throw new Error('Missing Stripe customer id.');
        }

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;

        const expandedSession = await stripe.checkout.sessions.retrieve(
          session.id,
          {
            expand: ['line_items'],
          },
        );

        const firstLineItem = expandedSession.line_items?.data?.[0];
        const priceId =
          (firstLineItem?.price?.id as string | undefined) ?? null;

        const email =
          session.customer_details?.email ??
          (session.metadata?.email as string | undefined) ??
          null;

        const plan =
          (session.metadata?.plan as string | undefined) ?? 'pro-monthly';

        const adminSupabase = createAdminClient();

        await (adminSupabase
          .from('billing_onboarding_sessions') as any)
          .upsert(
            {
              stripe_checkout_session_id: session.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_price_id: priceId,
              email,
              status: 'pending',
              metadata: {
                plan,
                client_reference_id: session.client_reference_id ?? null,
              },
            },
            {
              onConflict: 'stripe_checkout_session_id',
            },
          );

        break;
      }

      default: {
        // For other events, we simply acknowledge receipt for now
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error handling Stripe webhook:', event.type, error);
    return NextResponse.json(
      { error: 'Webhook handler failed.' },
      { status: 500 },
    );
  }
}


