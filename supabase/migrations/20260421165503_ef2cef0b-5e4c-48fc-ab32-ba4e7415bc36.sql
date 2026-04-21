-- 1. Agregar columnas para consignación bancaria
ALTER TABLE public.tesoreria_ofrendas_cdp
  ADD COLUMN IF NOT EXISTS valor_consignado NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_consignacion DATE,
  ADD COLUMN IF NOT EXISTS soporte_consignacion_url TEXT,
  ADD COLUMN IF NOT EXISTS consignacion_completada BOOLEAN NOT NULL DEFAULT false;

-- 2. Crear bucket de soportes de tesorería (público para acceso a comprobantes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('soportes-tesoreria', 'soportes-tesoreria', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage para el bucket
DROP POLICY IF EXISTS "Soportes tesoreria publico read" ON storage.objects;
CREATE POLICY "Soportes tesoreria publico read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'soportes-tesoreria');

DROP POLICY IF EXISTS "Soportes tesoreria roles upload" ON storage.objects;
CREATE POLICY "Soportes tesoreria roles upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'soportes-tesoreria' AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'pastor'::app_role) OR
      has_role(auth.uid(), 'tesoreria'::app_role)
    )
  );

DROP POLICY IF EXISTS "Soportes tesoreria roles update" ON storage.objects;
CREATE POLICY "Soportes tesoreria roles update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'soportes-tesoreria' AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'pastor'::app_role) OR
      has_role(auth.uid(), 'tesoreria'::app_role)
    )
  );

DROP POLICY IF EXISTS "Soportes tesoreria roles delete" ON storage.objects;
CREATE POLICY "Soportes tesoreria roles delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'soportes-tesoreria' AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'pastor'::app_role) OR
      has_role(auth.uid(), 'tesoreria'::app_role)
    )
  );