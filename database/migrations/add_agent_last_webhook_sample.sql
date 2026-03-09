-- Add last_webhook_sample to agents — stores the latest webhook payload for Test Webhook UI
-- Structure: { payload: object, receivedAt: string, webhookPath: string }

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS last_webhook_sample JSONB DEFAULT NULL;

COMMENT ON COLUMN public.agents.last_webhook_sample IS 'Latest webhook payload for agent webhook triggers — used by Test Webhook UI. Shape: { payload, receivedAt, webhookPath }';
