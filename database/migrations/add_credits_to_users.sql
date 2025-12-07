-- Migration: Add credit system columns to users table
-- Run this migration to add credit tracking to the users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_last_reset TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS total_credits_used INTEGER DEFAULT 0;

-- Update existing users based on their subscription tier
-- Personal: 100 credits, Professional: 500 credits
UPDATE public.users
SET 
  credits_balance = CASE 
    WHEN subscription_tier = 'personal' THEN 100
    WHEN subscription_tier = 'professional' THEN 500
    WHEN subscription_tier = 'enterprise' THEN 2000
    ELSE 0
  END,
  credits_last_reset = NOW()
WHERE credits_balance IS NULL OR credits_balance = 0;

-- Create index for credit queries
CREATE INDEX IF NOT EXISTS idx_users_credits_balance ON public.users(credits_balance);
CREATE INDEX IF NOT EXISTS idx_users_credits_last_reset ON public.users(credits_last_reset);


