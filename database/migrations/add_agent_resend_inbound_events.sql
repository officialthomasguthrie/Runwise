-- Phase 8: Inbound emails for agent-specific Resend addresses
-- Idempotency table to ensure we process each inbound email once.

CREATE TABLE IF NOT EXISTS public.agent_resend_inbound_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Resend Receiving "id" / email_id from the webhook payload
  resend_email_id TEXT NOT NULL,
  resend_message_id TEXT,
  from_email TEXT,
  to_email TEXT,
  subject TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_resend_inbound_events_resend_email_id_unique
  ON public.agent_resend_inbound_events (resend_email_id);

CREATE INDEX IF NOT EXISTS agent_resend_inbound_events_agent_id_idx
  ON public.agent_resend_inbound_events (agent_id, received_at DESC);

ALTER TABLE public.agent_resend_inbound_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own agent resend inbound events" ON public.agent_resend_inbound_events;
CREATE POLICY "Users can view own agent resend inbound events"
  ON public.agent_resend_inbound_events
  FOR SELECT
  USING (auth.uid() = user_id);

