-- Fix agent_chats: one chat per (agent, user), not per agent
-- Drop old unique(agent_id) if it exists, add composite unique(agent_id, user_id)

ALTER TABLE public.agent_chats DROP CONSTRAINT IF EXISTS agent_chats_agent_id_key;
ALTER TABLE public.agent_chats DROP CONSTRAINT IF EXISTS agent_chats_agent_id_user_id_key;
ALTER TABLE public.agent_chats ADD CONSTRAINT agent_chats_agent_id_user_id_key UNIQUE (agent_id, user_id);
