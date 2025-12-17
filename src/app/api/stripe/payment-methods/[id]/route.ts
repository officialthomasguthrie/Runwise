import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey != null ? new Stripe(stripeSecretKey) : null;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const paymentMethodId = id;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // If this is a mock/test payment method ID, skip Stripe API call
    // Mock IDs start with 'pm_test_' and don't exist in Stripe
    if (paymentMethodId.startsWith('pm_test_')) {
      // For mock data, just return success immediately
      return NextResponse.json({ success: true });
    }

    // Detach the payment method from the customer in Stripe
    // This will delete it if it's not attached to any subscriptions
    try {
      await stripe.paymentMethods.detach(paymentMethodId);
    } catch (stripeError: any) {
      // If the payment method is already detached or doesn't exist, that's okay
      if (stripeError.code !== 'resource_missing') {
        console.error('Error detaching payment method from Stripe:', stripeError);
        return NextResponse.json(
          { error: stripeError.message || 'Failed to delete payment method from Stripe' },
          { status: 500 }
        );
      }
    }

    // If you have a payment_methods table in Supabase, delete it from there too
    // For now, we'll just return success since the mock data is client-side only
    // In production, you'd want to:
    // const { error: dbError } = await supabase
    //   .from('payment_methods')
    //   .delete()
    //   .eq('stripe_payment_method_id', paymentMethodId)
    //   .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const paymentMethodId = id;
    const body = await request.json();
    const { expiryMonth, expiryYear, isDefault, cardholderName } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // If this is a mock/test payment method ID, just return success
    // Mock data will be saved to localStorage on the client side
    if (paymentMethodId.startsWith('pm_test_')) {
      return NextResponse.json({ 
        success: true,
        paymentMethod: {
          id: paymentMethodId,
          expiryMonth,
          expiryYear,
          isDefault
        }
      });
    }

    // For real payment methods, update in Stripe
    // Note: Stripe doesn't allow updating expiry dates directly on payment methods
    // You would need to create a new payment method with updated details
    // But we can update billing details (including cardholder name)
    if (cardholderName !== undefined) {
      await stripe.paymentMethods.update(paymentMethodId, {
        billing_details: {
          name: cardholderName,
        },
      });
    }

    if (isDefault !== undefined) {
      // Get the customer ID and subscription ID from the user's record
      const { data: userData } = await supabase
        .from('users')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('id', user.id)
        .single();

      const stripeCustomerId = (userData as any)?.stripe_customer_id;
      const stripeSubscriptionId = (userData as any)?.stripe_subscription_id;
      
      if (stripeCustomerId && isDefault) {
        // Set this payment method as the default for the customer
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        // Also update the subscription's default payment method if there's an active subscription
        if (stripeSubscriptionId) {
          try {
            await stripe.subscriptions.update(stripeSubscriptionId, {
              default_payment_method: paymentMethodId,
            });
          } catch (subError: any) {
            // If subscription update fails (e.g., subscription is cancelled), that's okay
            console.log('Could not update subscription default payment method:', subError.message);
          }
        }
      }
    }

    // If you have a payment_methods table in Supabase, update it there too
    // For now, we'll just return success
    // In production, you'd want to:
    // const { error: dbError } = await supabase
    //   .from('payment_methods')
    //   .update({
    //     expiry_month: expiryMonth,
    //     expiry_year: expiryYear,
    //     is_default: isDefault,
    //   })
    //   .eq('stripe_payment_method_id', paymentMethodId)
    //   .eq('user_id', user.id);

    // Retrieve the updated payment method to return its details
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const card = paymentMethod.card;

    return NextResponse.json({ 
      success: true,
      paymentMethod: {
        id: paymentMethodId,
        expiryMonth: card?.exp_month || expiryMonth,
        expiryYear: card?.exp_year || expiryYear,
        cardholderName: paymentMethod.billing_details?.name || cardholderName || '',
        isDefault
      }
    });
  } catch (error: any) {
    console.error('Error updating payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update payment method' },
      { status: 500 }
    );
  }
}

