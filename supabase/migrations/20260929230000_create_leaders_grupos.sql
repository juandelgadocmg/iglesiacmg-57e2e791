CREATE TABLE IF NOT EXISTS public.leaders_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL REFERENCES public.leaders(id) ON DELETE CASCADE,
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(leader_id, grupo_id)
);

ALTER TABLE public.leaders_grupos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage leaders_grupos" ON public.leaders_grupos FOR ALL TO authenticated USING (true);
