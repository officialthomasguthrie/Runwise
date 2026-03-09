-- =====================================================
-- Agent Chats (per-agent workspace chat)
-- =====================================================
-- Persists chat conversations for each agent workspace

CREATE TABLE IF NOT EXISTS public.agent_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_chats_agent_id ON public.agent_chats(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_chats_user_id ON public.agent_chats(user_id);

ALTER TABLE public.agent_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own agent chats" ON public.agent_chats;
DROP POLICY IF EXISTS "Users can insert own agent chats" ON public.agent_chats;
DROP POLICY IF EXISTS "Users can update own agent chats" ON public.agent_chats;
DROP POLICY IF EXISTS "Users can delete own agent chats" ON public.agent_chats;

CREATE POLICY "Users can view own agent chats" ON public.agent_chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agent chats" ON public.agent_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent chats" ON public.agent_chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agent chats" ON public.agent_chats
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_agent_chats_updated_at ON public.agent_chats;
CREATE TRIGGER update_agent_chats_updated_at
  BEFORE UPDATE ON public.agent_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.agent_chats IS 'Chat conversations per agent workspace - one chat per agent';
