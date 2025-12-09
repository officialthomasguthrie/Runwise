'use client';

import { Suspense, useEffect, useMemo, useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

type Status = 'loading' | 'ready' | 'submitting' | 'signed-in' | 'error';

// Glass input wrapper component matching signup page
const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-[#ffffff1a] bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-pink-400/70 focus-within:bg-pink-500/10" suppressHydrationWarning={true}>
    {children}
  </div>
);

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Helper function to get plan display name
  const getPlanDisplayName = (planId: string | null): string => {
    if (!planId) return 'Runwise';
    if (planId.startsWith('personal')) return 'Personal';
    if (planId.startsWith('pro')) return 'Professional';
    return 'Runwise';
  };

  const planDisplayName = getPlanDisplayName(plan);

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
        if (typeof payload.plan === 'string' && payload.plan.length > 0) {
          setPlan(payload.plan);
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

  const handleGoBack = () => {
    router.push('/#pricing');
  };

  if (status === 'signed-in') {
    return (
      <div className="h-[100dvh] flex items-center justify-center font-geist w-[100dvw] relative bg-background text-foreground" suppressHydrationWarning={true}>
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-semibold leading-tight mb-2">All set!</h1>
          <p className="text-xs text-muted-foreground">Redirecting you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw] relative bg-background text-foreground" suppressHydrationWarning={true}>
      {/* Go Back Button */}
      <button
        onClick={handleGoBack}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground rounded-lg backdrop-blur-sm"
      >
        <ArrowLeft className="w-3 h-3" />
        Go Back
      </button>

      {/* Left column: onboarding form */}
      <section className="flex-1 flex items-center justify-center p-3" suppressHydrationWarning={true}>
        <div className="w-full max-w-xs" suppressHydrationWarning={true}>
          <div className="flex flex-col gap-2" suppressHydrationWarning={true}>
            <h1 className="animate-element animate-delay-100 text-xl md:text-2xl font-semibold leading-tight">
              {status === 'loading' 
                ? 'Validating your payment…' 
                : `Finish setting up your ${planDisplayName} account`}
            </h1>
            <p className="animate-element animate-delay-200 text-xs text-muted-foreground">
              {status === 'loading'
                ? 'One moment while we prepare your onboarding experience.'
                : `Complete the form below to activate your Runwise ${planDisplayName} subscription.`}
            </p>

            {status === 'loading' ? (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-400"></div>
              </div>
            ) : (status === 'ready' || status === 'submitting') && (
              <form className="space-y-2 mt-4" onSubmit={handleSubmit} suppressHydrationWarning={true}>
                <div className="animate-element animate-delay-300 grid grid-cols-2 gap-2" suppressHydrationWarning={true}>
                  <div suppressHydrationWarning={true}>
                    <label className="text-xs font-medium text-muted-foreground">First Name</label>
                    <GlassInputWrapper>
                      <input
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-transparent text-xs p-1.5 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground"
                        required
                      />
                    </GlassInputWrapper>
                  </div>
                  <div suppressHydrationWarning={true}>
                    <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                    <GlassInputWrapper>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-transparent text-xs p-1.5 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground"
                        required
                      />
                    </GlassInputWrapper>
                  </div>
                </div>

                <div className="animate-element animate-delay-400" suppressHydrationWarning={true}>
                  <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                  <GlassInputWrapper>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-xs p-1.5 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </GlassInputWrapper>
                </div>

                <div className="animate-element animate-delay-500" suppressHydrationWarning={true}>
                  <label className="text-xs font-medium text-muted-foreground">Password</label>
                  <GlassInputWrapper>
                    <div className="relative" suppressHydrationWarning={true}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent text-xs p-1.5 pr-7 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-1.5 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                        ) : (
                          <Eye className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                        )}
                      </button>
                    </div>
                  </GlassInputWrapper>
                  <p className="text-xs text-muted-foreground mt-1">
                    Password must be at least 8 characters.
                  </p>
                </div>

                {errorMessage && (
                  <div className="animate-element animate-delay-600 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive" suppressHydrationWarning={true}>
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="animate-element animate-delay-700 w-full rounded-lg border border-[#ffffff1a] bg-[#bd28b3ba] py-1.5 cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center gap-[5px]">
                    <span className="text-xs">{status === 'submitting' ? 'Activating…' : 'Complete Setup'}</span>
                    {status !== 'submitting' && (
                      <img src="/assets/icons/arrow-top.svg" className="w-4 h-4" alt="arrow-top" />
                    )}
                  </div>
                </button>
              </form>
            )}

            {status === 'error' && errorMessage && (
              <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Right column: hero image */}
      <section className="hidden md:block flex-1 relative p-4" suppressHydrationWarning={true}>
        <div
          className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=2160&q=80)` }}
          suppressHydrationWarning={true}
        ></div>
      </section>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] flex items-center justify-center font-geist w-[100dvw] relative bg-background text-foreground" suppressHydrationWarning={true}>
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-semibold leading-tight mb-2">Validating your payment…</h1>
            <p className="text-xs text-muted-foreground">One moment while we prepare your onboarding experience.</p>
          </div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
