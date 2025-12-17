'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CreditCard, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

function AddCardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setupIntentSecret = searchParams.get('setup_intent');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!setupIntentSecret) {
      setStatus('error');
      setErrorMessage('Missing setup intent. Please try again.');
      return;
    }

    // In a full implementation, you would use Stripe Elements here
    // For now, we'll show instructions
    // The setup intent client secret can be used with Stripe Elements
    setStatus('error');
    setErrorMessage('Stripe Elements integration required. Please contact support to add a payment method, or add one during your next checkout.');
  }, [setupIntentSecret]);

  const handleBack = () => {
    router.push('/settings?tab=billing');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 space-y-4">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Setting up payment method...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="h-6 w-6 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Unable to Add Card</h2>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button onClick={handleBack} className="mt-4">
              Back to Billing
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Payment Method Added</h2>
              <p className="text-sm text-muted-foreground">Your payment method has been successfully added.</p>
            </div>
            <Button onClick={handleBack} className="mt-4">
              Back to Billing
            </Button>
          </div>
        )}
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <AddCardContent />
    </Suspense>
  );
}

