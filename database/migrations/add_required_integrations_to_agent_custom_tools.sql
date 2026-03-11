-- =====================================================
-- Add required_integrations to agent_custom_tools
-- =====================================================
-- Stores which service IDs (e.g. 'slack', 'github') a custom tool requires.
-- When set, the completion card shows Connect buttons instead of asking for credentials.

ALTER TABLE public.agent_custom_tools
ADD COLUMN IF NOT EXISTS required_integrations TEXT[] DEFAULT '{}';
