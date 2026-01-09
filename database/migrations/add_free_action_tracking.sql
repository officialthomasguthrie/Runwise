-- Migration: Add free action tracking for free users
-- This tracks if a free user has generated a workflow
-- Free users can send unlimited messages until they generate their first workflow
-- Once they generate a workflow, has_used_free_action is set to true and they must upgrade
-- Run this migration to add the tracking field to the users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS has_used_free_action BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups on free users
CREATE INDEX IF NOT EXISTS idx_users_has_used_free_action ON public.users(has_used_free_action) WHERE subscription_tier = 'free';

-- Set existing free users who have AI-generated workflows to have used their free action
UPDATE public.users
SET has_used_free_action = TRUE
WHERE subscription_tier = 'free' 
  AND id IN (
    SELECT DISTINCT user_id 
    FROM public.workflows 
    WHERE ai_generated = TRUE
  );

-- Also check if there are any conversations/messages for free users
-- If you have a conversations or messages table, update this query accordingly
-- For now, we'll just mark existing AI-generated workflows as the indicator

COMMENT ON COLUMN public.users.has_used_free_action IS 'Tracks if a free user has generated a workflow. Free users can send unlimited messages until they generate their first workflow. Once set to true (workflow generated), they must upgrade to continue chatting or generating workflows.';

