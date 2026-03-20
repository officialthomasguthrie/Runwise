-- Phase 1: Platform Resend / per-agent outbound email identity (columns on public.agents)
-- See docs/AGENT_RESEND_EMAIL_IMPLEMENTATION.md

-- email_sending_mode: which outbound email path(s) apply (Gmail user OAuth vs platform Resend)
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS email_sending_mode TEXT DEFAULT 'none';

UPDATE public.agents
SET email_sending_mode = 'none'
WHERE email_sending_mode IS NULL;

ALTER TABLE public.agents
  ALTER COLUMN email_sending_mode SET NOT NULL;

ALTER TABLE public.agents
  ALTER COLUMN email_sending_mode SET DEFAULT 'none';

ALTER TABLE public.agents
  DROP CONSTRAINT IF EXISTS agents_email_sending_mode_check;

ALTER TABLE public.agents
  ADD CONSTRAINT agents_email_sending_mode_check
  CHECK (
    email_sending_mode = ANY (
      ARRAY[
        'none'::text,
        'user_gmail'::text,
        'agent_resend'::text,
        'both'::text
      ]
    )
  );

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS resend_from_email TEXT;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS resend_from_name TEXT;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS resend_provisioned_at TIMESTAMPTZ;

COMMENT ON COLUMN public.agents.email_sending_mode IS
  'none | user_gmail | agent_resend | both — outbound email path(s); Gmail uses user OAuth, agent_resend uses platform Resend';

COMMENT ON COLUMN public.agents.resend_from_email IS
  'Full From address for platform Resend (e.g. agent-{id}@yourdomain.com); NULL until provisioned';

COMMENT ON COLUMN public.agents.resend_from_name IS
  'Display name for Resend From header';

COMMENT ON COLUMN public.agents.resend_provisioned_at IS
  'Timestamp when resend_from_email was assigned';

-- Prevent duplicate agent From addresses across rows
CREATE UNIQUE INDEX IF NOT EXISTS agents_resend_from_email_unique
  ON public.agents (resend_from_email)
  WHERE resend_from_email IS NOT NULL;
