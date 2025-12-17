"use client";

import { SignInPage, Testimonial } from "@/components/ui/sign-in";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "Sarah Chen",
    handle: "@sarahdigital",
    text: "Amazing platform! The user experience is seamless and the features are exactly what I needed."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Marcus Johnson",
    handle: "@marcustech",
    text: "This service has transformed how I work. Clean design, powerful features, and excellent support."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "David Martinez",
    handle: "@davidcreates",
    text: "I've tried many platforms, but this one stands out. Intuitive, reliable, and genuinely helpful for productivity."
  },
];

export default function LoginPage() {
  const { signIn, signInWithGoogle, signInWithMicrosoft } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check for error query parameter from auth callback
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get('error');
    
    if (errorParam === 'no_account') {
      setError('No account associated with that email. Please sign up through our checkout process.');
      // Clean up URL
      window.history.replaceState({}, '', '/login');
    } else if (errorParam === 'account_check_failed') {
      setError('Unable to verify account. Please try again.');
      window.history.replaceState({}, '', '/login');
    } else if (errorParam === 'auth_callback_failed') {
      setError('Authentication failed. Please try again.');
      window.history.replaceState({}, '', '/login');
    } else if (errorParam === 'unexpected_error') {
      setError('An unexpected error occurred. Please try again.');
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // Note: OAuth redirects automatically, so we don't need to handle success here
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const { error } = await signInWithMicrosoft();
      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // Note: OAuth redirects automatically, so we don't need to handle success here
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };
  
  const handleResetPassword = () => {
    // TODO: Implement password reset
    console.log("Reset password clicked");
  };

  const handleCreateAccount = () => {
    // Users create accounts after payment through checkout flow
    // Redirect to pricing section on landing page
    router.push('/#pricing');
  };

  const handleGoBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground" suppressHydrationWarning={true}>
      <SignInPage
        title={<span className="font-light text-foreground tracking-tighter">Welcome back</span>}
        description="Sign in to your account to continue building AI workflows"
        heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
        testimonials={sampleTestimonials}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onMicrosoftSignIn={handleMicrosoftSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
        onGoBack={handleGoBack}
      />
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-sm">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-400"></div>
            <p className="text-foreground">Signing in...</p>
          </div>
        </div>
      )}
    </div>
  );
}
