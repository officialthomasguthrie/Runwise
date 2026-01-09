-- Migration: Add is_paywall_message column to ai_chat_messages
-- This allows paywall messages with upgrade buttons to persist when chats are reopened

ALTER TABLE public.ai_chat_messages
ADD COLUMN IF NOT EXISTS is_paywall_message BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_is_paywall 
    ON public.ai_chat_messages(is_paywall_message) 
    WHERE is_paywall_message = TRUE;

COMMENT ON COLUMN public.ai_chat_messages.is_paywall_message IS 'Indicates if this message is a paywall message with upgrade buttons that should persist when the chat is reopened.';

