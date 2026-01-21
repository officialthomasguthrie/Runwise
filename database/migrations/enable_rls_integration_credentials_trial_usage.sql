-- Enable RLS on integration_credentials and trial_usage tables
-- This migration fixes Supabase security linter warnings for RLS disabled on public tables

-- ============================================================================
-- 1. ENABLE RLS ON integration_credentials TABLE
-- ============================================================================

ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view own integration credentials" ON public.integration_credentials;
DROP POLICY IF EXISTS "Users can insert own integration credentials" ON public.integration_credentials;
DROP POLICY IF EXISTS "Users can update own integration credentials" ON public.integration_credentials;
DROP POLICY IF EXISTS "Users can delete own integration credentials" ON public.integration_credentials;

-- Users can only view their own integration credentials
CREATE POLICY "Users can view own integration credentials" ON public.integration_credentials
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own integration credentials
CREATE POLICY "Users can insert own integration credentials" ON public.integration_credentials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own integration credentials
CREATE POLICY "Users can update own integration credentials" ON public.integration_credentials
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own integration credentials
CREATE POLICY "Users can delete own integration credentials" ON public.integration_credentials
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 2. ENABLE RLS ON trial_usage TABLE
-- ============================================================================

ALTER TABLE public.trial_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view own trial usage" ON public.trial_usage;

-- Users can only view their own trial usage records
CREATE POLICY "Users can view own trial usage" ON public.trial_usage
    FOR SELECT USING (
        user_id IS NOT NULL AND auth.uid() = user_id
    );

-- Note: INSERT/UPDATE/DELETE operations are done via admin client (service role)
-- which bypasses RLS automatically. We don't need user-facing policies for those.

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Service role operations (via admin client) automatically bypass RLS,
--    so webhook handlers and backend services will continue to work normally.
--
-- 2. The trial_usage table is primarily managed by backend services,
--    but users can view their own trial history if needed.
--
-- 3. All policies use auth.uid() to ensure users can only access their own data.
--
-- 4. For trial_usage, we only allow SELECT (view) for users. INSERT/UPDATE/DELETE
--    operations are handled by backend services using the service role, which
--    automatically bypasses RLS.

