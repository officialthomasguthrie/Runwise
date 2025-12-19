-- Migration: Give free users 5 credits on signup (one-time only)
-- This gives new free users 5 credits when they sign up
-- Free users NEVER get reset - they keep whatever balance they have
-- Once their 5 credits are used up, they're gone forever (no monthly renewal)

-- Ensure credit columns exist (in case this migration runs before add_credits_to_users.sql)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'credits_balance'
    ) THEN
        ALTER TABLE public.users
        ADD COLUMN credits_balance INTEGER DEFAULT 0,
        ADD COLUMN credits_used_this_month INTEGER DEFAULT 0,
        ADD COLUMN credits_last_reset TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN total_credits_used INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update handle_new_user function to give free users 5 credits
-- This includes the security fix (SET search_path = public)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (
        id, 
        email, 
        first_name, 
        last_name,
        subscription_tier,
        credits_balance,
        credits_used_this_month,
        credits_last_reset,
        total_credits_used
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'free', -- Default to free tier
        5, -- Give free users 5 credits on signup (one-time)
        0,
        NOW(),
        0
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts
    RETURN NEW;
END;
$$;

-- Give existing free users who have 0 credits the initial 5 credits
-- This is a one-time grant for existing users who haven't used any credits yet
UPDATE public.users
SET 
    credits_balance = 5,
    credits_last_reset = COALESCE(credits_last_reset, NOW())
WHERE 
    subscription_tier = 'free' 
    AND (credits_balance IS NULL OR credits_balance = 0)
    AND (total_credits_used IS NULL OR total_credits_used = 0); -- Only give to users who haven't used any credits yet

