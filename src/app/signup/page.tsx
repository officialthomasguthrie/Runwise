"use client";

import { SignUpPage, Testimonial } from "@/components/ui/sign-up";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLoadingPage } from "@/components/ui/auth-loading-page";

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

export default function SignupPage() {
  const { signUp, signInWithGoogle, signInWithMicrosoft } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const firstName = (formData.get("firstName") as string) ?? "";
    const lastName = (formData.get("lastName") as string) ?? "";
    const email = (formData.get("email") as string) ?? "";
    const password = (formData.get("password") as string) ?? "";
    const confirmPassword = (formData.get("confirmPassword") as string) ?? "";

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password, firstName, lastName);

      if (error) {
        setError(error.message ?? "Unable to create account. Please try again.");
        setLoading(false);
      } else {
        // Don't set loading to false - let the loading page stay until dashboard loads
        // New users will start on the free tier via the DB default / trigger
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message ?? "Unable to continue with Google. Please try again.");
        setLoading(false);
      }
      // Success path handled by OAuth redirect / auth callback
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleMicrosoftSignUp = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await signInWithMicrosoft();
      if (error) {
        setError(error.message ?? "Unable to continue with Microsoft. Please try again.");
        setLoading(false);
      }
      // Success path handled by OAuth redirect / auth callback
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleGoBack = () => {
    router.push("/");
  };

  if (loading) {
    return <AuthLoadingPage />;
  }

  return (
    <div className="auth-page min-h-screen w-full bg-background text-foreground" suppressHydrationWarning={true}>
      <SignUpPage
        title={<span className="font-light text-foreground tracking-tighter">Get Started</span>}
        description="Create your account and start building AI workflows"
        heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
        testimonials={sampleTestimonials}
        onSignUp={handleSignUp}
        onGoogleSignUp={handleGoogleSignUp}
        onMicrosoftSignUp={handleMicrosoftSignUp}
        onSignIn={handleSignIn}
        onGoBack={handleGoBack}
      />
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-sm">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}


