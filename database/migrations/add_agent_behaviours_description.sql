-- Add description to agent_behaviours — human-readable label for trigger (e.g. "Run when webhook receives a request at /my-path")
ALTER TABLE public.agent_behaviours ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.agent_behaviours.description IS 'Human-readable label for the trigger, used in the Triggers section of the agent tab';
