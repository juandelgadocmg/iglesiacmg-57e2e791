ALTER TABLE public.prog_iso_templates
  ADD COLUMN IF NOT EXISTS lider_nombre_manual text;

COMMENT ON COLUMN public.prog_iso_templates.lider_nombre_manual IS
'Nombre del líder de ministerio escrito manualmente. Si es NULL o vacío, se usa el líder configurado en prog_ministerios.lider_persona_id.';