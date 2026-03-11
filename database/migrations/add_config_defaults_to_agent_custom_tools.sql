-- =====================================================
-- Add config_defaults to agent_custom_tools
-- =====================================================
-- Fixes: Could not find the 'config_defaults' column of 'agent_custom_tools'
-- Table may have been created before config_defaults was in the schema.

ALTER TABLE public.agent_custom_tools
ADD COLUMN IF NOT EXISTS config_defaults JSONB DEFAULT '{}';
