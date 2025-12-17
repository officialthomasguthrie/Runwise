-- Create table to monitor Inngest function executions and quota usage
-- This tracks all Inngest function runs for monitoring and cost analysis

CREATE TABLE IF NOT EXISTS inngest_function_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_id TEXT NOT NULL,
  function_name TEXT NOT NULL,
  event_id TEXT,
  event_name TEXT,
  run_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  execution_id TEXT REFERENCES workflow_executions(id) ON DELETE SET NULL,
  trigger_type TEXT, -- 'manual', 'scheduled', 'webhook', 'polling', 'test'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER, -- Duration in milliseconds
  step_count INTEGER DEFAULT 0, -- Number of steps executed
  error_message TEXT,
  error_stack TEXT,
  metadata JSONB DEFAULT '{}', -- Additional metadata (event data, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_inngest_executions_function_id 
  ON inngest_function_executions(function_id);

CREATE INDEX IF NOT EXISTS idx_inngest_executions_status 
  ON inngest_function_executions(status);

CREATE INDEX IF NOT EXISTS idx_inngest_executions_user_id 
  ON inngest_function_executions(user_id);

CREATE INDEX IF NOT EXISTS idx_inngest_executions_workflow_id 
  ON inngest_function_executions(workflow_id);

CREATE INDEX IF NOT EXISTS idx_inngest_executions_started_at 
  ON inngest_function_executions(started_at);

CREATE INDEX IF NOT EXISTS idx_inngest_executions_trigger_type 
  ON inngest_function_executions(trigger_type);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_inngest_executions_function_status_date 
  ON inngest_function_executions(function_id, status, started_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_inngest_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inngest_executions_updated_at
  BEFORE UPDATE ON inngest_function_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_inngest_executions_updated_at();

-- Add comments
COMMENT ON TABLE inngest_function_executions IS 'Tracks all Inngest function executions for monitoring, quota tracking, and cost analysis';
COMMENT ON COLUMN inngest_function_executions.function_id IS 'Inngest function ID (e.g., workflow-executor, scheduled-workflow-trigger)';
COMMENT ON COLUMN inngest_function_executions.step_count IS 'Number of step.run() calls made (affects quota usage)';
COMMENT ON COLUMN inngest_function_executions.duration_ms IS 'Total execution duration in milliseconds';
COMMENT ON COLUMN inngest_function_executions.trigger_type IS 'How the function was triggered (manual, scheduled, webhook, polling, test)';

