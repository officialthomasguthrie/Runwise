-- Create polling_triggers table for database-backed scheduling
-- This enables per-trigger scheduling with user-configurable intervals

CREATE TABLE IF NOT EXISTS polling_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  last_cursor TEXT,
  last_seen_timestamp TIMESTAMPTZ,
  next_poll_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  poll_interval INTEGER NOT NULL DEFAULT 300, -- seconds (5 min default)
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, trigger_type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_polling_triggers_workflow_id 
  ON polling_triggers(workflow_id);

CREATE INDEX IF NOT EXISTS idx_polling_triggers_next_poll_at 
  ON polling_triggers(next_poll_at) WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_polling_triggers_enabled 
  ON polling_triggers(enabled) WHERE enabled = true;

-- Composite index for the main query: get due triggers
-- Note: Cannot use NOW() in index predicate (not immutable), so we index on columns
-- and filter at query time
CREATE INDEX IF NOT EXISTS idx_polling_triggers_due 
  ON polling_triggers(next_poll_at, enabled) 
  WHERE enabled = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_polling_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_polling_triggers_updated_at
  BEFORE UPDATE ON polling_triggers
  FOR EACH ROW
  EXECUTE FUNCTION update_polling_triggers_updated_at();

-- Add comments
COMMENT ON TABLE polling_triggers IS 'Stores polling trigger configuration and scheduling state for database-backed per-trigger scheduling';
COMMENT ON COLUMN polling_triggers.poll_interval IS 'Polling interval in seconds (e.g., 300 = 5 minutes, 900 = 15 minutes)';
COMMENT ON COLUMN polling_triggers.next_poll_at IS 'Next time this trigger should be polled (used by Cloudflare Worker cron)';
COMMENT ON COLUMN polling_triggers.last_cursor IS 'Last cursor/ID seen for idempotency (e.g., message ID, row number, timestamp)';

