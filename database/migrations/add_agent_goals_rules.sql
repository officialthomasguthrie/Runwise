-- Add goals_rules JSONB to agents — AI-generated goals and rules from user prompts/questionnaire
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS goals_rules JSONB DEFAULT '[]';

COMMENT ON COLUMN public.agents.goals_rules IS 'AI-generated goals (what agent works toward) and rules (how it behaves) — array of { id, type: "goal"|"rule", label }';
