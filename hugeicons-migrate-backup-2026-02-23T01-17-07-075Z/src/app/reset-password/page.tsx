"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-[#ffffff1a] bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-pink-400/70 focus-within:bg-pink-500/10" suppressHydrationWarning={true}>
    {children}
  </div>
);

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updatePassword } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have the necessary tokens in the URL
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    if (!token || type !== 'recovery') {
      setTokenValid(false);
      setError('Invalid or missing reset token. Please request a new password reset link.');
    } else {
      setTokenValid(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);

      if (error) {
        setError(error.message || 'Failed to update password. The link may have expired. Please request a new one.');
      } else {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login?reset=success');
        }, 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.push('/login');
  };

  if (tokenValid === false) {
    return (
      <div className="auth-page min-h-screen w-full bg-background text-foreground flex items-center justify-center p-3" suppressHydrationWarning={true}>
        <div className="w-full max-w-xs space-y-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <button
              onClick={handleGoBack}
              className="w-full rounded-lg border border-[#ffffff1a] bg-[#bd28b3ba] py-1.5 text-xs text-white cursor-pointer flex items-center justify-center"
            >
              <div className="flex items-center justify-center gap-[5px]">
                <span>Back to Login</span>
                <img src="/assets/icons/arrow-top.svg" className="w-4 h-4" alt="arrow-top" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page min-h-screen w-full bg-background text-foreground" suppressHydrationWarning={true}>
      {/* Go Back Button */}
      <button
        onClick={handleGoBack}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground rounded-lg backdrop-blur-sm"
      >
        <ArrowLeft className="w-3 h-3" />
        Go Back
      </button>

      {/* Main Content */}
      <section className="h-[100dvh] flex items-center justify-center p-3" suppressHydrationWarning={true}>
        <div className="w-full max-w-xs" suppressHydrationWarning={true}>
          <div className="flex flex-col gap-2" suppressHydrationWarning={true}>
            <h1 className="text-xl md:text-2xl font-semibold leading-tight">Reset Password</h1>
            <p className="text-xs text-muted-foreground">
              Enter your new password below
            </p>

            {success ? (
              <div className="space-y-3 mt-4">
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                  <p className="text-sm text-green-400 mb-2">
                    Password updated successfully! Redirecting to login...
                  </p>
                </div>
              </div>
            ) : (
              <form className="space-y-2 mt-2" onSubmit={handleSubmit} suppressHydrationWarning={true}>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">New Password</label>
                  <GlassInputWrapper>
                    <div className="relative" suppressHydrationWarning={true}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your new password"
                        className="w-full bg-transparent text-xs p-1.5 pr-7 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground"
                        disabled={loading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-1.5 flex items-center"
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                        ) : (
                          <Eye className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                        )}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                  <GlassInputWrapper>
                    <div className="relative" suppressHydrationWarning={true}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your new password"
                        className="w-full bg-transparent text-xs p-1.5 pr-7 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-1.5 flex items-center"
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                        ) : (
                          <Eye className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                        )}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg border border-[#ffffff1a] bg-[#bd28b3ba] py-1.5 cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      <span className="text-xs">Updating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-[5px]">
                      <span className="text-xs">Update Password</span>
                      <img src="/assets/icons/arrow-top.svg" className="w-4 h-4" alt="arrow-top" />
                    </div>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400 mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

