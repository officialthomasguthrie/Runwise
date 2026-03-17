/**
 * Create a Stripe Customer Portal session for existing subscribers.
 * Used for plan changes, payment method updates, and cancellations.
 * Prevents double charging by using Stripe's managed portal instead of creating new checkouts.
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey != null ? new Stripe(stripeSecretKey) : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured.' },
      { status: 500 },
    );
  }

  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000';

  let returnUrl = `${origin}/settings?tab=billing`;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.returnUrl === 'string' && body.returnUrl.startsWith(origin)) {
      returnUrl = body.returnUrl;
    }
  } catch {
    // Use default return URL
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: userRecord, error: dbError } = await adminSupabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (dbError || !userRecord) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const stripeCustomerId = (userRecord as { stripe_customer_id: string | null }).stripe_customer_id;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe to a plan first.' },
        { status: 400 },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Unable to create portal session.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating Stripe portal session:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to create portal session.' },
      { status: 500 },
    );
  }
}
