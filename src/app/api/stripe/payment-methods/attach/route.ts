import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey != null ? new Stripe(stripeSecretKey) : null;

/**
 * POST - Attach a payment method to a customer and optionally set as default
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
    const { paymentMethodId, setAsDefault } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Get the customer ID
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
      return NextResponse.json(
        { error: 'Stripe customer ID not found' },
        { status: 404 }
      );
    }

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    // If setAsDefault is true, set it as the default payment method
    if (setAsDefault) {
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Retrieve the payment method to return its details
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const card = paymentMethod.card;

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        last4: card?.last4 || '',
        brand: card?.brand || 'unknown',
        expiryMonth: card?.exp_month || 0,
        expiryYear: card?.exp_year || 0,
        cardholderName: paymentMethod.billing_details?.name || '',
        isDefault: setAsDefault || false,
      },
    });
  } catch (error: any) {
    console.error('Error attaching payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to attach payment method' },
      { status: 500 }
    );
  }
}

