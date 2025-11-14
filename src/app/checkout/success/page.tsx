'use client';

import { Suspense, useEffect, useMemo, useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Status = 'loading' | 'ready' | 'submitting' | 'signed-in' | 'error';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    async function hydrate() {
      if (!sessionId) {
        setStatus('error');
        setErrorMessage('Missing checkout session identifier.');
        return;
      }

      try {
        const response = await fetch('/api/onboarding/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? 'Failed to look up onboarding session.');
        }

        const payload = await response.json();
        setToken(payload.token);
        if (typeof payload.email === 'string' && payload.email.length > 0) {
          setEmail(payload.email);
        }
        setStatus('ready');
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(
          error?.message ??
            'We could not validate your payment session. Please contact support.',
        );
      }
    }

    hydrate();
  }, [sessionId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setErrorMessage('Onboarding token missing. Please refresh the page.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPassword = password.trim();

    if (
      !trimmedEmail ||
      !trimmedFirstName ||
      !trimmedLastName ||
      trimmedPassword.length < 8
    ) {
      setStatus('ready');
      setErrorMessage(
        'Please fill out all fields. Password must be at least 8 characters long.',
      );
      return;
    }

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email: trimmedEmail,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          password: trimmedPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to complete onboarding.');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (signInError) {
        throw new Error(
          signInError.message ??
            'Payment processed, but automatic sign-in failed. Please login manually.',
        );
      }

      setStatus('signed-in');
      router.push('/dashboard');
    } catch (error: any) {
      setStatus('ready');
      setErrorMessage(
        error?.message ??
          'We could not complete onboarding. Please contact support.',
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {status === 'signed-in'
              ? 'All set!'
              : 'Finish setting up your Runwise Pro account'}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {status === 'signed-in'
              ? 'Redirecting you to your dashboard…'
              : 'Complete the form below to activate your Runwise Professional subscription.'}
          </p>

          {status !== 'signed-in' && (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  placeholder="Choose a secure password"
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters.
                </p>
              </div>

              {errorMessage && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={status === 'submitting' || status === 'loading'}
              >
                {status === 'submitting' ? 'Activating…' : 'Activate Runwise Pro'}
              </Button>
            </form>
          )}

          {status === 'loading' && (
            <p className="mt-6 text-sm text-muted-foreground">
              Validating your payment…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <div className="container mx-auto max-w-2xl px-4 py-16">
            <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Validating your payment…
              </h1>
              <p className="mt-3 text-muted-foreground">
                One moment while we prepare your onboarding experience.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}



