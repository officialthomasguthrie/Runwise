    -- Add short_description to agents — AI-generated one-liner (e.g. "Outbound SDR for SaaS leads")
    ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS short_description TEXT;

    COMMENT ON COLUMN public.agents.short_description IS 'AI-generated one-line tagline describing what the agent does';
