ALTER TABLE public.planilla_historial
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS content_ref text,
  ADD COLUMN IF NOT EXISTS formato text NOT NULL DEFAULT 'pdf';

CREATE INDEX IF NOT EXISTS idx_planilla_historial_content_ref ON public.planilla_historial(content_ref);