-- Add avatar_image to agents — profile picture path (e.g. /Profile2.jpg) for consistency between list and detail views
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS avatar_image TEXT DEFAULT NULL;

COMMENT ON COLUMN public.agents.avatar_image IS 'Profile image path (e.g. /Profile2.jpg) — same randomized style as agent tab, persisted for consistency';

-- Backfill existing agents with deterministic avatar (matches getAgentAvatarUrl hash: sum of char codes mod 3)
UPDATE public.agents a
SET avatar_image = CASE abs((SELECT coalesce(sum(ascii(substring(a.id::text, i, 1))), 0) FROM generate_series(1, length(a.id::text)) i))::int % 3
  WHEN 0 THEN '/Profile2.jpg'
  WHEN 1 THEN '/Profile3.jpg'
  ELSE '/Profile4.jpg'
END
WHERE a.avatar_image IS NULL;
