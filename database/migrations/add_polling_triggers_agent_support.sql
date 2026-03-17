-- Add agent_id support to polling_triggers for agent polling behaviours.
-- Enables agents with polling triggers (Gmail, Slack, etc.) to be scheduled by the Cloudflare Worker.
--
-- Before: workflow_id NOT NULL REFERENCES workflows(id) — agents could not create triggers.
-- After: Either workflow_id (workflows) OR agent_id (agents) must be set.

-- Add agent_id for agent polling triggers
ALTER TABLE public.polling_triggers
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE;

-- Make workflow_id nullable so agent triggers can use agent_id only
ALTER TABLE public.polling_triggers
  ALTER COLUMN workflow_id DROP NOT NULL;

-- Add check: either workflow_id or agent_id must be set
ALTER TABLE public.polling_triggers
  DROP CONSTRAINT IF EXISTS polling_triggers_workflow_or_agent;

ALTER TABLE public.polling_triggers
  ADD CONSTRAINT polling_triggers_workflow_or_agent
  CHECK (
    (workflow_id IS NOT NULL AND agent_id IS NULL) OR
    (workflow_id IS NULL AND agent_id IS NOT NULL)
  );

-- Replace old unique constraint with partial indexes (workflow and agent triggers are mutually exclusive)
ALTER TABLE public.polling_triggers
  DROP CONSTRAINT IF EXISTS polling_triggers_workflow_id_trigger_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_polling_triggers_workflow_trigger
  ON public.polling_triggers(workflow_id, trigger_type)
  WHERE workflow_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_polling_triggers_agent_trigger
  ON public.polling_triggers(agent_id, trigger_type)
  WHERE agent_id IS NOT NULL;

-- Index for agent_id lookups (disable/enable/delete by agent)
CREATE INDEX IF NOT EXISTS idx_polling_triggers_agent_id
  ON public.polling_triggers(agent_id)
  WHERE agent_id IS NOT NULL;

COMMENT ON COLUMN public.polling_triggers.agent_id IS 'For agent polling triggers; when set, workflow_id is null';

-- Update RLS policies to allow agent-owned triggers
DROP POLICY IF EXISTS "Users can view own polling triggers" ON public.polling_triggers;
DROP POLICY IF EXISTS "Users can create own polling triggers" ON public.polling_triggers;
DROP POLICY IF EXISTS "Users can update own polling triggers" ON public.polling_triggers;
DROP POLICY IF EXISTS "Users can delete own polling triggers" ON public.polling_triggers;

CREATE POLICY "Users can view own polling triggers" ON public.polling_triggers
  FOR SELECT USING (
    (workflow_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_id AND user_id = auth.uid()))
    OR
    (agent_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND user_id = auth.uid()))
  );

CREATE POLICY "Users can create own polling triggers" ON public.polling_triggers
  FOR INSERT WITH CHECK (
    (workflow_id IS NOT NULL AND agent_id IS NULL AND EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_id AND user_id = auth.uid()))
    OR
    (workflow_id IS NULL AND agent_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND user_id = auth.uid()))
  );

CREATE POLICY "Users can update own polling triggers" ON public.polling_triggers
  FOR UPDATE USING (
    (workflow_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_id AND user_id = auth.uid()))
    OR
    (agent_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND user_id = auth.uid()))
  );

CREATE POLICY "Users can delete own polling triggers" ON public.polling_triggers
  FOR DELETE USING (
    (workflow_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.workflows WHERE id = workflow_id AND user_id = auth.uid()))
    OR
    (agent_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND user_id = auth.uid()))
  );
