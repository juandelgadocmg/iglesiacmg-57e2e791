-- Nueva tabla: consignación semanal única por todo el recaudo de CDP
CREATE TABLE IF NOT EXISTS public.tesoreria_consignacion_semanal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_inicio DATE NOT NULL UNIQUE,
  semana_fin DATE NOT NULL,
  valor_total_entregado NUMERIC NOT NULL DEFAULT 0,
  valor_consignado NUMERIC NOT NULL DEFAULT 0,
  fecha_consignacion DATE,
  soporte_consignacion_url TEXT,
  observacion TEXT,
  consignacion_completada BOOLEAN NOT NULL DEFAULT false,
  registrado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tes_consig_semanal_semana
  ON public.tesoreria_consignacion_semanal(semana_inicio);

ALTER TABLE public.tesoreria_consignacion_semanal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tesoreria semanal roles manage"
  ON public.tesoreria_consignacion_semanal;

CREATE POLICY "Tesoreria semanal roles manage"
  ON public.tesoreria_consignacion_semanal
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

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_tes_consig_semanal_updated_at
  ON public.tesoreria_consignacion_semanal;
CREATE TRIGGER trg_tes_consig_semanal_updated_at
  BEFORE UPDATE ON public.tesoreria_consignacion_semanal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Apuntar el historial de consignaciones a la consignación semanal (opcional, ahora unificado)
ALTER TABLE public.tesoreria_consignacion_historial
  ADD COLUMN IF NOT EXISTS consignacion_semanal_id UUID
  REFERENCES public.tesoreria_consignacion_semanal(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tes_consig_hist_semanal
  ON public.tesoreria_consignacion_historial(consignacion_semanal_id);
