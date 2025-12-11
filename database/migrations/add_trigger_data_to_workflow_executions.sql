-- Add missing columns to workflow_executions table
-- This migration adds trigger_data, trigger_type, input_data, and output_data columns
-- that are required by the workflow execution code but missing from the workflow-execution-schema.sql

-- Add trigger_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_executions' 
        AND column_name = 'trigger_type'
    ) THEN
        ALTER TABLE public.workflow_executions 
        ADD COLUMN trigger_type TEXT DEFAULT 'manual';
        
        -- Update existing rows to have a default trigger_type
        UPDATE public.workflow_executions 
        SET trigger_type = 'manual' 
        WHERE trigger_type IS NULL;
        
        -- Make it NOT NULL after setting defaults
        ALTER TABLE public.workflow_executions 
        ALTER COLUMN trigger_type SET NOT NULL;
    END IF;
END $$;

-- Add trigger_data column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_executions' 
        AND column_name = 'trigger_data'
    ) THEN
        ALTER TABLE public.workflow_executions 
        ADD COLUMN trigger_data JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add input_data column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_executions' 
        AND column_name = 'input_data'
    ) THEN
        ALTER TABLE public.workflow_executions 
        ADD COLUMN input_data JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add output_data column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_executions' 
        AND column_name = 'output_data'
    ) THEN
        ALTER TABLE public.workflow_executions 
        ADD COLUMN output_data JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add error_message column if it doesn't exist (checking if 'error' column exists instead)
DO $$ 
BEGIN
    -- Check if 'error' column exists (from workflow-execution-schema.sql)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_executions' 
        AND column_name = 'error'
    ) THEN
        -- If 'error' exists but 'error_message' doesn't, add error_message and copy data
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workflow_executions' 
            AND column_name = 'error_message'
        ) THEN
            ALTER TABLE public.workflow_executions 
            ADD COLUMN error_message TEXT;
            
            -- Copy data from 'error' to 'error_message'
            UPDATE public.workflow_executions 
            SET error_message = error 
            WHERE error IS NOT NULL;
        END IF;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_executions' 
        AND column_name = 'error_message'
    ) THEN
        -- If neither exists, add error_message
        ALTER TABLE public.workflow_executions 
        ADD COLUMN error_message TEXT;
    END IF;
END $$;

-- Add execution_time_ms column if it doesn't exist (checking if 'duration_ms' column exists instead)
DO $$ 
BEGIN
    -- Check if 'duration_ms' column exists (from workflow-execution-schema.sql)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_executions' 
        AND column_name = 'duration_ms'
    ) THEN
        -- If 'duration_ms' exists but 'execution_time_ms' doesn't, add execution_time_ms and copy data
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workflow_executions' 
            AND column_name = 'execution_time_ms'
        ) THEN
            ALTER TABLE public.workflow_executions 
            ADD COLUMN execution_time_ms INTEGER;
            
            -- Copy data from 'duration_ms' to 'execution_time_ms'
            UPDATE public.workflow_executions 
            SET execution_time_ms = duration_ms 
            WHERE duration_ms IS NOT NULL;
        END IF;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_executions' 
        AND column_name = 'execution_time_ms'
    ) THEN
        -- If neither exists, add execution_time_ms
        ALTER TABLE public.workflow_executions 
        ADD COLUMN execution_time_ms INTEGER;
    END IF;
END $$;

