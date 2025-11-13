-- =====================================================
-- AI Chat System Schema
-- =====================================================
-- Tables for storing AI chat conversations and messages

-- AI Chat Conversations
CREATE TABLE IF NOT EXISTS public.ai_chat_conversations (
    id TEXT PRIMARY KEY, -- Using TEXT to match client-side generated IDs
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'Untitled Chat',
    preview TEXT,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Chat Messages
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
    id TEXT PRIMARY KEY, -- Using TEXT to match client-side generated IDs
    conversation_id TEXT REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    workflow_generated BOOLEAN DEFAULT FALSE,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_user_id 
    ON public.ai_chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_updated_at 
    ON public.ai_chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conversation_id 
    ON public.ai_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at 
    ON public.ai_chat_messages(created_at);

-- Row Level Security Policies
ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-run)
DROP POLICY IF EXISTS "Users can view own conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Users can delete messages in own conversations" ON public.ai_chat_messages;

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON public.ai_chat_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations" ON public.ai_chat_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.ai_chat_conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.ai_chat_conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in own conversations" ON public.ai_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ai_chat_conversations 
            WHERE id = conversation_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in own conversations" ON public.ai_chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_chat_conversations 
            WHERE id = conversation_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages in own conversations" ON public.ai_chat_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.ai_chat_conversations 
            WHERE id = conversation_id AND user_id = auth.uid()
        )
    );

-- Trigger to update conversation timestamp and message count
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.ai_chat_conversations
    SET 
        last_message_at = NOW(),
        updated_at = NOW(),
        message_count = (
            SELECT COUNT(*) FROM public.ai_chat_messages 
            WHERE conversation_id = NEW.conversation_id
        ),
        preview = CASE 
            WHEN LENGTH(NEW.content) > 100 THEN SUBSTRING(NEW.content, 1, 100) || '...'
            ELSE NEW.content
        END
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_message_created ON public.ai_chat_messages;
DROP TRIGGER IF EXISTS update_ai_chat_conversations_updated_at ON public.ai_chat_conversations;

-- Create triggers
CREATE TRIGGER on_message_created
    AFTER INSERT ON public.ai_chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

CREATE TRIGGER update_ai_chat_conversations_updated_at 
    BEFORE UPDATE ON public.ai_chat_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.ai_chat_conversations IS 'AI chat conversation sessions';
COMMENT ON TABLE public.ai_chat_messages IS 'Individual messages within AI chat conversations';

