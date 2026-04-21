-- 1. Configuración: parámetros para Tesorería CDP
ALTER TABLE public.configuracion_iglesia
  ADD COLUMN IF NOT EXISTS tesoreria_cdp_tolerancia_pct NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tesoreria_cdp_tolerancia_abs NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tesoreria_cdp_dias_mora INTEGER NOT NULL DEFAULT 7;

-- 2. Historial de consignaciones
CREATE TABLE IF NOT EXISTS public.tesoreria_consignacion_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID NOT NULL REFERENCES public.tesoreria_ofrendas_cdp(id) ON DELETE CASCADE,
  soporte_url TEXT,
  valor_consignado NUMERIC,
  fecha_consignacion DATE,
  motivo_cambio TEXT,
  cambiado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tes_consig_hist_registro
  ON public.tesoreria_consignacion_historial(registro_id);

ALTER TABLE public.tesoreria_consignacion_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tesoreria historial roles manage"
  ON public.tesoreria_consignacion_historial;

CREATE POLICY "Tesoreria historial roles manage"
  ON public.tesoreria_consignacion_historial
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'pastor'::app_role) OR
    has_role(auth.uid(), 'tesoreria'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'pastor'::app_role) OR
    has_role(auth.uid(), 'tesoreria'::app_role)
  );