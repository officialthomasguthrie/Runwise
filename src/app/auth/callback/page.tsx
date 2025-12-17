"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Completing sign in...');
  const supabase = createClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if this is a password recovery callback
        const type = searchParams.get('type');
        const token = searchParams.get('token');
        
        if (type === 'recovery' && token) {
          // This is a password reset flow - redirect to reset password page
          router.push(`/reset-password?token=${encodeURIComponent(token)}&type=recovery`);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          window.location.href = '/login?error=auth_callback_failed';
          return;
        }

        if (data.session) {
          const userId = data.session.user.id;
          
          // Check if user exists in the users table (prevents new signups)
          try {
            const checkResponse = await fetch('/api/auth/check-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId }),
            });

            const checkData = await checkResponse.json();

            if (!checkData.exists) {
              // User doesn't exist in users table - this is a new signup attempt
              // Sign them out and redirect to login with error
              await supabase.auth.signOut();
              // Use window.location to force a full page reload and clear session state
              // This ensures middleware sees the user as unauthenticated
              window.location.href = '/login?error=no_account';
              return;
            }

            // User exists, proceed to dashboard
            router.push('/dashboard');
          } catch (checkError) {
            console.error('Error checking user existence:', checkError);
            // If check fails, sign out to be safe and redirect to login
            await supabase.auth.signOut();
            // Use window.location to force a full page reload and clear session state
            window.location.href = '/login?error=account_check_failed';
            return;
          }
        } else {
          // No session found, redirect to login
          router.push('/login');
        }
      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        window.location.href = '/login?error=unexpected_error';
      }
    };

    handleAuthCallback();
  }, [router, supabase.auth, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400 mx-auto mb-4"></div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}