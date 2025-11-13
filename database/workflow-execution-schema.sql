-- Workflow Execution Tables
-- Schema for tracking workflow executions and their logs
-- 
-- Note: All ID columns use TEXT type for consistency with execution_id format
-- which is generated as "exec_timestamp_random" in the application code.
-- We use gen_random_uuid()::TEXT for other IDs to maintain TEXT consistency.

-- Enable pgcrypto for gen_random_uuid() (available in PostgreSQL 9.4+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (to fix type mismatches)
-- This will cascade delete all dependent data
DROP TABLE IF EXISTS public.execution_logs CASCADE;
DROP TABLE IF EXISTS public.node_execution_results CASCADE;
DROP TABLE IF EXISTS public.workflow_executions CASCADE;

-- Workflow Executions Table
CREATE TABLE public.workflow_executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed', 'partial')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    final_output JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Node Execution Results Table
CREATE TABLE public.node_execution_results (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    execution_id TEXT REFERENCES public.workflow_executions(id) ON DELETE CASCADE NOT NULL,
    node_id TEXT NOT NULL,
    node_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    output_data JSONB,
    error TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution Logs Table
CREATE TABLE public.execution_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    execution_id TEXT REFERENCES public.workflow_executions(id) ON DELETE CASCADE NOT NULL,
    node_result_id TEXT REFERENCES public.node_execution_results(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
    message TEXT NOT NULL,
    data JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON public.workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON public.workflow_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_node_execution_results_execution_id ON public.node_execution_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id ON public.execution_logs(execution_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_execution_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

-- Workflow Executions Policies
CREATE POLICY "Users can view own executions" 
    ON public.workflow_executions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions" 
    ON public.workflow_executions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executions" 
    ON public.workflow_executions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own executions" 
    ON public.workflow_executions FOR DELETE 
    USING (auth.uid() = user_id);

-- Node Execution Results Policies
CREATE POLICY "Users can view own node results" 
    ON public.node_execution_results FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.workflow_executions 
            WHERE id = node_execution_results.execution_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own node results" 
    ON public.node_execution_results FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workflow_executions 
            WHERE id = node_execution_results.execution_id 
            AND user_id = auth.uid()
        )
    );

-- Execution Logs Policies
CREATE POLICY "Users can view own execution logs" 
    ON public.execution_logs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.workflow_executions 
            WHERE id = execution_logs.execution_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own execution logs" 
    ON public.execution_logs FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workflow_executions 
            WHERE id = execution_logs.execution_id 
            AND user_id = auth.uid()
        )
    );

-- Function to automatically set completed_at and calculate duration
CREATE OR REPLACE FUNCTION update_execution_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('success', 'failed', 'partial') AND OLD.status = 'running' THEN
        NEW.completed_at = NOW();
        NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update completed_at and duration
DROP TRIGGER IF EXISTS trigger_update_execution_completed ON public.workflow_executions;
CREATE TRIGGER trigger_update_execution_completed
    BEFORE UPDATE ON public.workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_execution_completed();

-- Comments for documentation
COMMENT ON TABLE public.workflow_executions IS 'Stores workflow execution records';
COMMENT ON TABLE public.node_execution_results IS 'Stores individual node execution results within a workflow execution';
COMMENT ON TABLE public.execution_logs IS 'Stores logs generated during workflow execution';

