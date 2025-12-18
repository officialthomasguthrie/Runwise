"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // Subscription tier from public.users (e.g. 'free', 'pro', 'enterprise')
  subscriptionTier: string | null;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithMicrosoft: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  
  useEffect(() => {
    // Only create Supabase client on client side
    if (typeof window !== 'undefined') {
      setSupabase(createClient());
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    
    const loadSubscriptionTier = async (currentUser: User | null) => {
      if (!currentUser) {
        setSubscriptionTier(null);
        return;
      }

      try {
        const { data, error } = await (supabase
          .from('users') as any)
          .select('subscription_tier')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error('Auth: Error loading subscription tier:', error);
          setSubscriptionTier('free');
          return;
        }

        setSubscriptionTier((data as any)?.subscription_tier || 'free');
      } catch (error) {
        console.error('Auth: Unexpected error loading subscription tier:', error);
        setSubscriptionTier('free');
      }
    };
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        await loadSubscriptionTier(session?.user ?? null);
      } catch (error) {
        console.error('Auth: Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        await loadSubscriptionTier(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    if (!supabase) return { error: new Error('Supabase client not initialized') };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) {
      console.error('Signup error:', error);
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase client not initialized') };
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    if (typeof window === 'undefined' || !supabase) {
      return { error: new Error('Window is not available or Supabase client not initialized') };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { error };
  };

  const signInWithMicrosoft = async () => {
    if (typeof window === 'undefined' || !supabase) {
      return { error: new Error('Window is not available or Supabase client not initialized') };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    if (!supabase) return;
    try {
      const { data: { user: refreshedUser }, error } = await supabase.auth.getUser();
      if (!error && refreshedUser) {
        setUser(refreshedUser);
        // Also refresh session to get updated metadata
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        if (refreshedSession) {
          setSession(refreshedSession);
        }
        // Refresh subscription tier from users table
        try {
          const { data, error: tierError } = await (supabase
            .from('users') as any)
            .select('subscription_tier')
            .eq('id', refreshedUser.id)
            .single();

          if (tierError) {
            console.error('Auth: Error refreshing subscription tier:', tierError);
          } else {
            setSubscriptionTier((data as any)?.subscription_tier || 'free');
          }
        } catch (tierError) {
          console.error('Auth: Unexpected error refreshing subscription tier:', tierError);
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const refreshSubscription = async () => {
    if (!supabase) return;
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error || !currentUser) {
        console.error('Auth: Error getting user for refreshSubscription:', error);
        return;
      }
      const { data, error: tierError } = await (supabase
        .from('users') as any)
        .select('subscription_tier')
        .eq('id', currentUser.id)
        .single();

      if (tierError) {
        console.error('Auth: Error in refreshSubscription:', tierError);
      } else {
        setSubscriptionTier((data as any)?.subscription_tier || 'free');
      }
    } catch (error) {
      console.error('Auth: Unexpected error in refreshSubscription:', error);
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase || typeof window === 'undefined') {
      return { error: new Error('Supabase client not initialized or window not available') };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase) return { error: new Error('Supabase client not initialized') };
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    subscriptionTier,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMicrosoft,
    signOut,
    refreshUser,
    refreshSubscription,
    resetPassword,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
