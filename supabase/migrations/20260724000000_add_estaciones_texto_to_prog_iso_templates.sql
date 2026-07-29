ALTER TABLE public.prog_iso_templates
  ADD COLUMN IF NOT EXISTS estaciones_texto text[] NULL;

COMMENT ON COLUMN public.prog_iso_templates.estaciones_texto IS 'Lista de estaciones que deben registrarse como texto libre en lugar de asignar una persona.';
