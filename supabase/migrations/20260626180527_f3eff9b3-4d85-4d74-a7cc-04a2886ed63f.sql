ALTER TABLE public.prog_iso_templates
  ADD COLUMN IF NOT EXISTS fecha_inicio date,
  ADD COLUMN IF NOT EXISTS fecha_fin date;

COMMENT ON COLUMN public.prog_iso_templates.fecha_inicio IS 'Fecha inicial del rango de reuniones donde aparece el ministerio. NULL = sin límite inferior.';
COMMENT ON COLUMN public.prog_iso_templates.fecha_fin IS 'Fecha final del rango de reuniones donde aparece el ministerio. NULL = sin límite superior.';