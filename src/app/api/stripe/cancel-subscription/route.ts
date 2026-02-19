import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST() {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured.' },
      { status: 500 },
    );
  }

  try {
    // Verify the requesting user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Look up the user's Stripe subscription ID from the database
    const adminSupabase = createAdminClient();
    const { data: userRecord, error: dbError } = await (adminSupabase
      .from('users') as any)
      .select('stripe_subscription_id, subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();

    if (dbError || !userRecord) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const subscriptionId = userRecord.stripe_subscription_id as string | null;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found for this account.' },
        { status: 400 },
      );
    }

    // Cancel immediately (not at period end)
    await stripe.subscriptions.cancel(subscriptionId);

    // Update the user record in the database
    const now = new Date().toISOString();
    await (adminSupabase.from('users') as any)
      .update({
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        stripe_subscription_id: null,
        updated_at: now,
      })
      .eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to cancel subscription.' },
      { status: 500 },
    );
  }
}
