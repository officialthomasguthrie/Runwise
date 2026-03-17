-- Add 'pending_integrations' to agents.status
-- Agents with polling triggers and disconnected integrations stay in this state until all are connected.

-- Drop existing status check (PostgreSQL may name it agents_status_check or similar)
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_status_check;

-- Add updated constraint including pending_integrations
ALTER TABLE public.agents
  ADD CONSTRAINT agents_status_check
  CHECK (status IN ('active', 'paused', 'deploying', 'error', 'pending_integrations'));

COMMENT ON COLUMN public.agents.status IS 'active | paused | deploying | error | pending_integrations (waiting for required integrations to be connected)';
