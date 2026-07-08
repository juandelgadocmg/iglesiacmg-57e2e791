
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_persona_id_key
  ON public.profiles(persona_id) WHERE persona_id IS NOT NULL;

-- Backfill: match profiles to personas by email (case/trim-insensitive) using auth.users.email
UPDATE public.profiles p
SET persona_id = per.id
FROM auth.users u
JOIN public.personas per
  ON LOWER(TRIM(per.email)) = LOWER(TRIM(u.email))
WHERE p.user_id = u.id
  AND p.persona_id IS NULL
  AND per.email IS NOT NULL
  AND per.email <> '';
