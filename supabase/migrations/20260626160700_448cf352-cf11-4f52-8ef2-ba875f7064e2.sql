
CREATE TABLE public.prog_iso_templates (
  ministerio_id uuid PRIMARY KEY REFERENCES public.prog_ministerios(id) ON DELETE CASCADE,
  codigo text,
  version text,
  fecha_vigencia text,
  titulo text,
  estaciones jsonb,
  importante text,
  responsabilidades text,
  firmas jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prog_iso_templates TO authenticated;
GRANT ALL ON public.prog_iso_templates TO service_role;

ALTER TABLE public.prog_iso_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read iso templates"
  ON public.prog_iso_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff manage iso templates"
  ON public.prog_iso_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'pastor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'pastor'));

CREATE TRIGGER trg_prog_iso_templates_updated
BEFORE UPDATE ON public.prog_iso_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
