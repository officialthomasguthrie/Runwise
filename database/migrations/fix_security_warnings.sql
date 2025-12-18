-- Fix Security Warnings
-- This migration addresses Supabase security linter warnings:
-- 1. Function search_path mutable (security risk)
-- 2. RLS disabled on public tables
-- 3. Extension in public schema (note: pg_trgm extension issue)

-- ============================================================================
-- 1. FIX FUNCTION SEARCH_PATH ISSUES
-- ============================================================================
-- All functions should have SET search_path = '' or SET search_path = public
-- to prevent search path injection attacks

-- Fix update_inngest_executions_updated_at
CREATE OR REPLACE FUNCTION update_inngest_executions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_polling_triggers_updated_at
CREATE OR REPLACE FUNCTION update_polling_triggers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_execution_completed
CREATE OR REPLACE FUNCTION update_execution_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status IN ('success', 'failed', 'partial') AND OLD.status = 'running' THEN
        NEW.completed_at = NOW();
        NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
    END IF;
    RETURN NEW;
END;
$$;

-- Fix update_conversation_on_message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.ai_chat_conversations
    SET 
        last_message_at = NOW(),
        updated_at = NOW(),
        message_count = (
            SELECT COUNT(*) FROM public.ai_chat_messages 
            WHERE conversation_id = NEW.conversation_id
        ),
        preview = CASE 
            WHEN LENGTH(NEW.content) > 100 THEN SUBSTRING(NEW.content, 1, 100) || '...'
            ELSE NEW.content
        END
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    );
    RETURN NEW;
END;
$$;

-- Fix reset_usage_counters
CREATE OR REPLACE FUNCTION reset_usage_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.users 
    SET usage_count = 0, usage_reset_at = NOW() + INTERVAL '1 month'
    WHERE usage_reset_at <= NOW();
    
    UPDATE public.teams 
    SET usage_count = 0, usage_reset_at = NOW() + INTERVAL '1 month'
    WHERE usage_reset_at <= NOW();
END;
$$;

-- ============================================================================
-- 2. ENABLE RLS ON PUBLIC TABLES
-- ============================================================================

-- Enable RLS on polling_triggers
ALTER TABLE public.polling_triggers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on inngest_function_executions
ALTER TABLE public.inngest_function_executions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. CREATE RLS POLICIES FOR polling_triggers
-- ============================================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view own polling triggers" ON public.polling_triggers;
DROP POLICY IF EXISTS "Users can create own polling triggers" ON public.polling_triggers;
DROP POLICY IF EXISTS "Users can update own polling triggers" ON public.polling_triggers;
DROP POLICY IF EXISTS "Users can delete own polling triggers" ON public.polling_triggers;

-- Users can only manage polling triggers for their own workflows
CREATE POLICY "Users can view own polling triggers" ON public.polling_triggers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workflows 
            WHERE id = workflow_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own polling triggers" ON public.polling_triggers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workflows 
            WHERE id = workflow_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own polling triggers" ON public.polling_triggers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workflows 
            WHERE id = workflow_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own polling triggers" ON public.polling_triggers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.workflows 
            WHERE id = workflow_id AND user_id = auth.uid()
        )
    );

-- ============================================================================
-- 4. CREATE RLS POLICIES FOR inngest_function_executions
-- ============================================================================

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Users can view own execution monitoring" ON public.inngest_function_executions;

-- Users can only view their own execution monitoring data
CREATE POLICY "Users can view own execution monitoring" ON public.inngest_function_executions
    FOR SELECT USING (auth.uid() = user_id);

-- Note: INSERT/UPDATE/DELETE operations are done via admin client (service role)
-- which bypasses RLS automatically. We don't need user-facing policies for those.

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Extension in public schema (pg_trgm): This is a warning but less critical.
--    To fix, you would need to move the extension to a different schema, but
--    this requires careful migration and may break existing functionality.
--    Consider addressing this separately if needed.
--
-- 2. Leaked Password Protection: This is a Supabase Auth setting, not a database
--    issue. Enable it in: Supabase Dashboard > Authentication > Password Settings
--    Enable "Leaked Password Protection"

