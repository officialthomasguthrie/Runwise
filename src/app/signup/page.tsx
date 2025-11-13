"use client";

import { SignUpPage, Testimonial } from "@/components/ui/sign-up";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useState } from "react";

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "Emma Rodriguez",
    handle: "@emmarodriguez",
    text: "The AI workflow builder has revolutionized how I automate my daily tasks. Incredibly intuitive and powerful!"
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/22.jpg",
    name: "James Wilson",
    handle: "@jameswilson",
    text: "Finally, a platform that understands what I need. The natural language processing is spot-on and saves me hours."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/68.jpg",
    name: "Lisa Thompson",
    handle: "@lisathompson",
    text: "As a business owner, this tool has streamlined my operations like nothing else. Highly recommend to anyone looking to scale."
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
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password, firstName, lastName);

      if (error) {
        setError(error.message);
      } else {
        // Redirect to dashboard - team creation will happen there
        router.push('/dashboard');
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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

  const handleMicrosoftSignUp = async () => {
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

  const handleSignIn = () => {
    router.push('/login');
  };

  const handleGoBack = () => {
    router.push('/');
  };

  return (
    <div className="bg-background text-foreground" suppressHydrationWarning={true}>
      <SignUpPage
        title={<span className="font-light text-foreground tracking-tighter">Get Started</span>}
        description="Create your account and start building AI workflows"
        heroImageSrc="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=2160&q=80"
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
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-400"></div>
            <p className="text-foreground">Signing up...</p>
          </div>
        </div>
      )}
    </div>
  );
}
