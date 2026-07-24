
-- 1) Planilla config columns on configuracion_iglesia
ALTER TABLE public.configuracion_iglesia
  ADD COLUMN IF NOT EXISTS planilla_titulo TEXT DEFAULT 'Planilla de Asistencia',
  ADD COLUMN IF NOT EXISTS planilla_subtitulo TEXT,
  ADD COLUMN IF NOT EXISTS planilla_pie TEXT DEFAULT 'DOXA · CMG Admin',
  ADD COLUMN IF NOT EXISTS planilla_color_encabezado TEXT DEFAULT '#111111',
  ADD COLUMN IF NOT EXISTS planilla_mostrar_logo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS planilla_columnas JSONB NOT NULL DEFAULT '["nombre","hora","puntualidad","metodo","firma"]'::jsonb;

-- 2) Signature fields on asistencia
ALTER TABLE public.asistencia
  ADD COLUMN IF NOT EXISTS firma_data_url TEXT,
  ADD COLUMN IF NOT EXISTS firma_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS firma_capturada_por UUID;

-- 3) Planilla history table
CREATE TABLE IF NOT EXISTS public.planilla_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE CASCADE,
  generada_por UUID NOT NULL,
  generada_por_email TEXT,
  total_asistentes INTEGER NOT NULL DEFAULT 0,
  total_personas INTEGER NOT NULL DEFAULT 0,
  tasa_asistencia NUMERIC(5,2) NOT NULL DEFAULT 0,
  parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.planilla_historial TO authenticated;
GRANT ALL ON public.planilla_historial TO service_role;

ALTER TABLE public.planilla_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planilla_hist_insert_own" ON public.planilla_historial;
CREATE POLICY "planilla_hist_insert_own"
  ON public.planilla_historial FOR INSERT TO authenticated
  WITH CHECK (generada_por = auth.uid());

DROP POLICY IF EXISTS "planilla_hist_select_own_or_admin" ON public.planilla_historial;
CREATE POLICY "planilla_hist_select_own_or_admin"
  ON public.planilla_historial FOR SELECT TO authenticated
  USING (
    generada_por = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'pastor'::app_role)
  );

CREATE INDEX IF NOT EXISTS idx_planilla_historial_servicio ON public.planilla_historial(servicio_id, created_at DESC);
