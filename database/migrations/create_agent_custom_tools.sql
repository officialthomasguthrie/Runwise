-- =====================================================
-- Agent Custom Tools
-- =====================================================
-- Builder-generated tools for agents (Teams webhook, scrapers, API wrappers, etc.)
-- Created during agent build, executed in sandbox at runtime

CREATE TABLE IF NOT EXISTS public.agent_custom_tools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  code TEXT NOT NULL,
  input_schema JSONB NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'javascript',
  config_defaults JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_custom_tools_agent_id ON public.agent_custom_tools(agent_id);

ALTER TABLE public.agent_custom_tools ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read custom tools for their own agents. API (service role) bypasses RLS for insert/update/delete.
DROP POLICY IF EXISTS "Users can view custom tools for own agents" ON public.agent_custom_tools;
CREATE POLICY "Users can view custom tools for own agents" ON public.agent_custom_tools
  FOR SELECT USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.agent_custom_tools IS 'Builder-generated tools for agents — Teams webhook, scrapers, API wrappers. Executed in sandbox at runtime.';
