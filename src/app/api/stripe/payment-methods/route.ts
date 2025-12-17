import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey != null ? new Stripe(stripeSecretKey) : null;

/**
 * GET - List all payment methods for the authenticated user
 */
export async function GET(request: NextRequest) {
  if (!stripe || !stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Missing STRIPE_SECRET_KEY.' },
      { status: 500 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the customer ID from the user's record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found or missing Stripe customer ID' },
        { status: 404 }
      );
    }

    const stripeCustomerId = (userData as any)?.stripe_customer_id;
    if (!stripeCustomerId) {
      // No customer ID means no payment methods yet
      return NextResponse.json({ paymentMethods: [] });
    }

    // Get the customer's default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    const defaultPaymentMethodId = 
      typeof customer === 'object' && !customer.deleted
        ? (customer as Stripe.Customer).invoice_settings?.default_payment_method
        : null;

    // List all payment methods for this customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    // Transform to our format
    const formattedPaymentMethods = paymentMethods.data.map((pm) => {
      const card = pm.card;
      return {
        id: pm.id,
        type: pm.type,
        last4: card?.last4 || '',
        brand: card?.brand || 'unknown',
        expiryMonth: card?.exp_month || 0,
        expiryYear: card?.exp_year || 0,
        cardholderName: pm.billing_details?.name || '',
        isDefault: pm.id === defaultPaymentMethodId || 
                   (typeof defaultPaymentMethodId === 'string' && pm.id === defaultPaymentMethodId),
      };
    });

    return NextResponse.json({ paymentMethods: formattedPaymentMethods });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a Setup Intent for adding a new payment method
 */
export async function POST(request: NextRequest) {
  if (!stripe || !stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Missing STRIPE_SECRET_KEY.' },
      { status: 500 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { setAsDefault } = body || {};

    // Get or create the customer ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let stripeCustomerId = (userData as any)?.stripe_customer_id;

    // If no customer ID, create a customer in Stripe
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Update the user record with the customer ID
      await (supabase
        .from('users') as any)
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // Create a Setup Intent for adding a payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session', // For future payments
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
      setAsDefault: setAsDefault || false,
    });
  } catch (error: any) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}

