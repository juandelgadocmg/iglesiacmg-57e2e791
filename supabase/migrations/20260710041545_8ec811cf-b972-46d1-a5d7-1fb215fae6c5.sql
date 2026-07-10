
CREATE TABLE public.prog_evento_textos (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.prog_ministerios(id) on delete cascade,
  evento_id uuid not null references public.prog_eventos(id) on delete cascade,
  campo text not null,
  valor text not null default '',
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ministerio_id, evento_id, campo)
);

CREATE INDEX prog_evento_textos_min_ev_idx ON public.prog_evento_textos (ministerio_id, evento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prog_evento_textos TO authenticated;
GRANT ALL ON public.prog_evento_textos TO service_role;

ALTER TABLE public.prog_evento_textos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prog_textos_select_staff"
ON public.prog_evento_textos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::public.app_role)
  OR public.has_role(auth.uid(),'super_admin'::public.app_role)
  OR public.has_role(auth.uid(),'pastor'::public.app_role)
  OR public.has_role(auth.uid(),'lider_red'::public.app_role)
  OR public.has_role(auth.uid(),'maestro'::public.app_role)
);

CREATE POLICY "prog_textos_write_staff"
ON public.prog_evento_textos FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::public.app_role)
  OR public.has_role(auth.uid(),'super_admin'::public.app_role)
  OR public.has_role(auth.uid(),'pastor'::public.app_role)
  OR public.has_role(auth.uid(),'lider_red'::public.app_role)
  OR public.has_role(auth.uid(),'maestro'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::public.app_role)
  OR public.has_role(auth.uid(),'super_admin'::public.app_role)
  OR public.has_role(auth.uid(),'pastor'::public.app_role)
  OR public.has_role(auth.uid(),'lider_red'::public.app_role)
  OR public.has_role(auth.uid(),'maestro'::public.app_role)
);

CREATE TRIGGER prog_evento_textos_updated_at
BEFORE UPDATE ON public.prog_evento_textos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
