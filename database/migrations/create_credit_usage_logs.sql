-- Migration: Create credit_usage_logs table
-- Run this migration to create a dedicated table for tracking credit usage

CREATE TABLE IF NOT EXISTS public.credit_usage_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    credits INTEGER NOT NULL CHECK (credits > 0),
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
    execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_user_id ON public.credit_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_created_at ON public.credit_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_workflow_id ON public.credit_usage_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_logs_execution_id ON public.credit_usage_logs(execution_id);

-- Enable Row Level Security
ALTER TABLE public.credit_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own credit usage logs
CREATE POLICY "Users can view their own credit usage logs"
    ON public.credit_usage_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert credit usage logs (for server-side operations)
CREATE POLICY "Service role can insert credit usage logs"
    ON public.credit_usage_logs
    FOR INSERT
    WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.credit_usage_logs IS 'Tracks all credit usage events for analytics and auditing';

