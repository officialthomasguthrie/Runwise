    -- =====================================================
    -- Trial Usage Tracking Migration
    -- =====================================================
    -- This migration creates a table to track trial usage
    -- to prevent users from using multiple free trials

    -- Create table to track trial usage
    CREATE TABLE IF NOT EXISTS public.trial_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    payment_method_fingerprint TEXT, -- Stripe payment method fingerprint
    payment_method_last4 TEXT,
    trial_started_at TIMESTAMPTZ NOT NULL,
    trial_ended_at TIMESTAMPTZ,
    subscription_id TEXT,
    plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for fast lookups
    CREATE INDEX IF NOT EXISTS idx_trial_usage_user_id ON public.trial_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_trial_usage_customer_id ON public.trial_usage(stripe_customer_id);
    CREATE INDEX IF NOT EXISTS idx_trial_usage_fingerprint ON public.trial_usage(payment_method_fingerprint);
    CREATE INDEX IF NOT EXISTS idx_trial_usage_subscription_id ON public.trial_usage(subscription_id);

    -- Add comment to table
    COMMENT ON TABLE public.trial_usage IS 'Tracks free trial usage to prevent duplicate trials by user, customer, or payment method';

    -- Add comments to columns
    COMMENT ON COLUMN public.trial_usage.payment_method_fingerprint IS 'Stripe payment method fingerprint - unique identifier for credit card';
    COMMENT ON COLUMN public.trial_usage.user_id IS 'User ID from auth.users - can be null if user was not logged in during trial';
    COMMENT ON COLUMN public.trial_usage.stripe_customer_id IS 'Stripe customer ID - used to track trials even if user_id is null';

