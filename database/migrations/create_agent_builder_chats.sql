-- =====================================================
-- Agent Builder Chats
-- =====================================================
-- Persists agent builder conversations so they survive page reloads

CREATE TABLE IF NOT EXISTS public.agent_builder_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  pipeline_phase TEXT NOT NULL DEFAULT 'initial' CHECK (pipeline_phase IN (
    'initial', 'awaiting_integrations', 'awaiting_questionnaire',
    'awaiting_confirmation', 'building', 'complete'
  )),
  pending_plan JSONB,
  accumulated_questionnaire_answers JSONB DEFAULT '[]',
  agent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_builder_chats_user_id ON public.agent_builder_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_builder_chats_updated_at ON public.agent_builder_chats(updated_at DESC);

ALTER TABLE public.agent_builder_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own agent builder chats" ON public.agent_builder_chats;
DROP POLICY IF EXISTS "Users can create agent builder chats" ON public.agent_builder_chats;
DROP POLICY IF EXISTS "Users can update own agent builder chats" ON public.agent_builder_chats;
DROP POLICY IF EXISTS "Users can delete own agent builder chats" ON public.agent_builder_chats;

CREATE POLICY "Users can view own agent builder chats" ON public.agent_builder_chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create agent builder chats" ON public.agent_builder_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent builder chats" ON public.agent_builder_chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agent builder chats" ON public.agent_builder_chats
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agent_builder_chats_updated_at ON public.agent_builder_chats;
CREATE TRIGGER update_agent_builder_chats_updated_at
  BEFORE UPDATE ON public.agent_builder_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.agent_builder_chats IS 'Agent builder chat sessions - persists conversations across page reloads';
