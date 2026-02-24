'use client';

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CheckmarkCircle01Icon, CreditCardIcon, Loading02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function AddCardForm({ setupIntentSecret }: { setupIntentSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm the setup intent
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/settings/billing/add-card?status=success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'An error occurred while processing your card.');
        setIsProcessing(false);
        return;
      }

      if (setupIntent?.status === 'succeeded' && setupIntent.payment_method) {
        // Attach the payment method to the customer
        const attachResponse = await fetch('/api/stripe/payment-methods/attach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentMethodId: setupIntent.payment_method as string,
            setAsDefault: false, // Don't set as default automatically
          }),
        });

        if (!attachResponse.ok) {
          const errorData = await attachResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to attach payment method');
        }

        // Success - redirect to success page
        router.push('/settings/billing/add-card?status=success');
      } else {
        setError('Setup intent was not completed. Please try again.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('Error processing payment method:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <PaymentElement />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/settings?tab=billing')}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Add Card'
          )}
        </Button>
      </div>
    </form>
  );
}

function AddCardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setupIntentSecret = searchParams.get('setup_intent');
  const statusParam = searchParams.get('status');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'form'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [options, setOptions] = useState<any>(null);

  useEffect(() => {
    if (statusParam === 'success') {
      setStatus('success');
      return;
    }

    if (!setupIntentSecret) {
      setStatus('error');
      setErrorMessage('Missing setup intent. Please try again.');
      return;
    }

    // Configure Stripe Elements options
    setOptions({
      clientSecret: setupIntentSecret,
      appearance: {
        theme: 'stripe',
      },
    });

    setStatus('form');
  }, [setupIntentSecret, statusParam]);

  const handleBack = () => {
    router.push('/settings?tab=billing');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <HugeiconsIcon icon={Loading02Icon} className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Setting up payment method...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <HugeiconsIcon icon={Cancel01Icon} className="h-6 w-6 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Unable to Add Card</h2>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button onClick={handleBack} className="mt-4">
              Back to Billing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-6 w-6 text-green-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Payment Method Added</h2>
              <p className="text-sm text-muted-foreground">Your payment method has been successfully added.</p>
            </div>
            <Button onClick={handleBack} className="mt-4">
              Back to Billing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Form view
  if (!options) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Add Payment Method</h2>
          <p className="text-sm text-muted-foreground">Enter your card details to add a new payment method.</p>
        </div>

        <Elements stripe={stripePromise} options={options}>
          <AddCardForm setupIntentSecret={setupIntentSecret!} />
        </Elements>
      </div>
    </div>
  );
}

export default function AddCardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border border-border rounded-lg p-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <HugeiconsIcon icon={Loading02Icon} className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <AddCardContent />
    </Suspense>
  );
}
