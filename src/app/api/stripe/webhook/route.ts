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

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // If subscription has a trial, record it
        if (subscription.trial_start && subscription.trial_end) {
          try {
            const customerId = typeof subscription.customer === 'string' 
              ? subscription.customer 
              : subscription.customer?.id;

            if (!customerId) {
              console.error('Missing customer ID in subscription webhook');
              break;
            }

            // Get customer details
            const customer = await stripe.customers.retrieve(customerId);
            
            if (customer.deleted) {
              break;
            }

            // Get payment method if available
            let paymentMethodFingerprint: string | null = null;
            let paymentMethodLast4: string | null = null;
            
            if (subscription.default_payment_method) {
              const pmId = typeof subscription.default_payment_method === 'string'
                ? subscription.default_payment_method
                : subscription.default_payment_method.id;
              
              try {
                const paymentMethod = await stripe.paymentMethods.retrieve(pmId);
                if (paymentMethod.card) {
                  paymentMethodFingerprint = paymentMethod.card.fingerprint || null;
                  paymentMethodLast4 = paymentMethod.card.last4 || null;
                }
              } catch (pmError) {
                console.error('Error retrieving payment method:', pmError);
                // Continue without payment method info
              }
            }

            const adminSupabase = createAdminClient();
            
            // Find user by customer ID or email
            let userId: string | null = null;
            if (subscription.metadata?.initiatedByUserId) {
              userId = subscription.metadata.initiatedByUserId;
            } else if ('email' in customer && customer.email) {
              const { data: user } = await adminSupabase
                .from('users')
                .select('id')
                .eq('email', customer.email)
                .maybeSingle();
              
              if (user && 'id' in user) {
                userId = (user as { id: string }).id;
              }
            }

            // Check if trial usage already exists for this subscription
            const { data: existingTrial } = await adminSupabase
              .from('trial_usage')
              .select('id')
              .eq('subscription_id', subscription.id)
              .maybeSingle();

            // Only insert if it doesn't exist
            if (!existingTrial) {
              // Record trial usage
              await (adminSupabase
                .from('trial_usage') as any)
                .insert({
                  user_id: userId || null,
                  stripe_customer_id: customerId,
                  payment_method_fingerprint: paymentMethodFingerprint,
                  payment_method_last4: paymentMethodLast4,
                  trial_started_at: new Date(subscription.trial_start * 1000).toISOString(),
                  trial_ended_at: new Date(subscription.trial_end * 1000).toISOString(),
                  subscription_id: subscription.id,
                  plan: subscription.metadata?.plan || 'unknown',
                });

              // Mark customer metadata that they've used a trial
              try {
                await stripe.customers.update(customerId, {
                  metadata: {
                    ...('metadata' in customer ? customer.metadata : {}),
                    used_trial: 'true',
                    trial_used_at: new Date().toISOString(),
                    trial_subscription_id: subscription.id,
                  },
                });
              } catch (updateError) {
                console.error('Error updating customer metadata:', updateError);
                // Continue even if metadata update fails
              }
            }
          } catch (error) {
            console.error('Error processing subscription trial:', error);
            // Continue processing even if trial tracking fails
          }
        }
        
        break;
      }

      case 'payment_method.attached': {
        // Check if payment method fingerprint has been used for a trial before
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        
        if (paymentMethod.card?.fingerprint && paymentMethod.customer) {
          try {
            const customerId = typeof paymentMethod.customer === 'string'
              ? paymentMethod.customer
              : paymentMethod.customer?.id;

            if (!customerId) {
              break;
            }

            const adminSupabase = createAdminClient();
            
            // Check if this fingerprint has been used for a trial before
            const { data: existingTrial } = await adminSupabase
              .from('trial_usage')
              .select('id, stripe_customer_id')
              .eq('payment_method_fingerprint', paymentMethod.card.fingerprint)
              .limit(1)
              .maybeSingle();

            if (existingTrial) {
              // Mark customer metadata if card was used for trial
              try {
                const customer = await stripe.customers.retrieve(customerId);
                if (!customer.deleted) {
                  await stripe.customers.update(customerId, {
                    metadata: {
                      ...('metadata' in customer ? customer.metadata : {}),
                      card_used_for_trial: 'true',
                      card_fingerprint: paymentMethod.card.fingerprint,
                    },
                  });
                }
              } catch (updateError) {
                console.error('Error updating customer metadata for payment method:', updateError);
              }
            }
          } catch (error) {
            console.error('Error checking payment method fingerprint:', error);
            // Continue processing even if payment method check fails
          }
        }
        
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


