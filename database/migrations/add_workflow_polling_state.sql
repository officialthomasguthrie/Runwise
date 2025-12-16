-- Create table to store polling state for workflow triggers
-- This allows us to track what data we've already seen and only trigger on new data

CREATE TABLE IF NOT EXISTS workflow_polling_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, trigger_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workflow_polling_state_workflow_id 
  ON workflow_polling_state(workflow_id);

CREATE INDEX IF NOT EXISTS idx_workflow_polling_state_trigger_type 
  ON workflow_polling_state(trigger_type);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_workflow_polling_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_polling_state_updated_at
  BEFORE UPDATE ON workflow_polling_state
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_polling_state_updated_at();

-- Add comment
COMMENT ON TABLE workflow_polling_state IS 'Stores polling state for workflow triggers to track last seen data and avoid duplicate triggers';


