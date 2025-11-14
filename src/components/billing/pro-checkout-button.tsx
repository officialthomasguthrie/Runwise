'use client';

import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';

interface ProCheckoutButtonProps extends ButtonProps {
  buttonText?: string;
  plan?: 'pro-monthly' | 'personal-monthly';
}

export function ProCheckoutButton({
  buttonText,
  children,
  disabled,
  plan = 'pro-monthly',
  ...props
}: ProCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = disabled || isLoading;

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error ?? 'Unable to start checkout. Please try again.',
        );
      }

      const payload = await response.json();
      if (!payload.url) {
        throw new Error('Stripe did not return a checkout URL.');
      }

      window.location.href = payload.url as string;
    } catch (error: any) {
      console.error('Failed to start checkout:', error);
      setError(
        error?.message ??
          'We could not start the checkout flow. Please try again.',
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={handleClick} disabled={isDisabled} {...props}>
        {isLoading ? 'Redirecting…' : buttonText ?? children ?? 'Buy Now'}
      </Button>
      {error && (
        <p className="text-xs text-destructive text-center max-w-xs">{error}</p>
      )}
    </div>
  );
}


