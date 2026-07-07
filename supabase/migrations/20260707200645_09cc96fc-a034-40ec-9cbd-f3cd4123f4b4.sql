ALTER TABLE public.prog_eventos ADD COLUMN IF NOT EXISTS servidor_texto text;
ALTER TABLE public.prog_eventos ADD COLUMN IF NOT EXISTS asignacion_texto text;
ALTER TABLE public.prog_eventos ADD COLUMN IF NOT EXISTS observacion text;