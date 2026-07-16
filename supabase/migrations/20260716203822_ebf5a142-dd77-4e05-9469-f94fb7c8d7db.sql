
-- 1) Tabla de versiones
CREATE TABLE IF NOT EXISTS public.tema_semana_versiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text,
  descripcion text,
  url text,
  pdf_url text,
  fecha_inicio date,
  fecha_fin date,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','revertido')),
  parent_version_id uuid REFERENCES public.tema_semana_versiones(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_tema_semana_vig ON public.tema_semana_versiones (estado, fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_tema_semana_created ON public.tema_semana_versiones (created_at DESC);

-- 2) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tema_semana_versiones TO authenticated;
GRANT ALL ON public.tema_semana_versiones TO service_role;

-- 3) RLS
ALTER TABLE public.tema_semana_versiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read tema_semana_versiones"
  ON public.tema_semana_versiones FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admin manage tema_semana_versiones insert"
  ON public.tema_semana_versiones FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'super_admin'::public.app_role)
    OR public.has_role(auth.uid(),'pastor'::public.app_role)
  );

CREATE POLICY "admin manage tema_semana_versiones update"
  ON public.tema_semana_versiones FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'super_admin'::public.app_role)
    OR public.has_role(auth.uid(),'pastor'::public.app_role)
  );

CREATE POLICY "admin manage tema_semana_versiones delete"
  ON public.tema_semana_versiones FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'super_admin'::public.app_role)
    OR public.has_role(auth.uid(),'pastor'::public.app_role)
  );

-- 4) Trigger updated_at + auditoría
CREATE TRIGGER tema_semana_versiones_updated_at
  BEFORE UPDATE ON public.tema_semana_versiones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tema_semana_versiones_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.tema_semana_versiones
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();

-- 5) Función: versión vigente
CREATE OR REPLACE FUNCTION public.tema_semana_vigente()
RETURNS TABLE (
  id uuid,
  titulo text,
  descripcion text,
  url text,
  pdf_url text,
  fecha_inicio date,
  fecha_fin date,
  created_by_email text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.tema_semana_versiones%ROWTYPE;
BEGIN
  -- 1) versiones cuya vigencia cubre hoy
  SELECT * INTO v_row FROM public.tema_semana_versiones
   WHERE estado = 'activo'
     AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE)
     AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
   ORDER BY COALESCE(fecha_inicio, DATE '0001-01-01') DESC, created_at DESC
   LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    RETURN QUERY SELECT v_row.id, v_row.titulo, v_row.descripcion, v_row.url, v_row.pdf_url,
                        v_row.fecha_inicio, v_row.fecha_fin, v_row.created_by_email, v_row.created_at;
    RETURN;
  END IF;

  -- 2) fallback: última versión activa
  SELECT * INTO v_row FROM public.tema_semana_versiones
   WHERE estado = 'activo'
   ORDER BY created_at DESC LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    RETURN QUERY SELECT v_row.id, v_row.titulo, v_row.descripcion, v_row.url, v_row.pdf_url,
                        v_row.fecha_inicio, v_row.fecha_fin, v_row.created_by_email, v_row.created_at;
    RETURN;
  END IF;

  -- 3) fallback: valores legacy de configuracion_iglesia
  RETURN QUERY
    SELECT NULL::uuid, c.tema_semana_titulo, c.tema_semana_descripcion, c.tema_semana_url,
           c.tema_semana_pdf_url, NULL::date, NULL::date, NULL::text, NULL::timestamptz
    FROM public.configuracion_iglesia c LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.tema_semana_vigente() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tema_semana_vigente() TO authenticated;

-- 6) Función: revertir versión
CREATE OR REPLACE FUNCTION public.tema_semana_revertir(_version_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_src public.tema_semana_versiones%ROWTYPE;
  v_new_id uuid;
  v_email text;
BEGIN
  IF NOT (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'super_admin'::public.app_role)
    OR public.has_role(auth.uid(),'pastor'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para revertir versiones del Tema de la Semana';
  END IF;

  SELECT * INTO v_src FROM public.tema_semana_versiones WHERE id = _version_id;
  IF v_src.id IS NULL THEN
    RAISE EXCEPTION 'Versión no encontrada';
  END IF;

  BEGIN SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN v_email := NULL; END;

  -- Cerrar la vigencia de cualquier versión actualmente vigente
  UPDATE public.tema_semana_versiones
     SET fecha_fin = CURRENT_DATE - 1
   WHERE estado = 'activo'
     AND id <> _version_id
     AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE)
     AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE);

  INSERT INTO public.tema_semana_versiones
    (titulo, descripcion, url, pdf_url, fecha_inicio, fecha_fin, estado, parent_version_id, created_by, created_by_email)
  VALUES
    (v_src.titulo, v_src.descripcion, v_src.url, v_src.pdf_url, CURRENT_DATE, NULL, 'activo', v_src.id, auth.uid(), v_email)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tema_semana_revertir(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tema_semana_revertir(uuid) TO authenticated;

-- 7) Semilla: importar la configuración actual si tiene datos y aún no hay versiones
INSERT INTO public.tema_semana_versiones
  (titulo, descripcion, url, pdf_url, created_by_email)
SELECT c.tema_semana_titulo, c.tema_semana_descripcion, c.tema_semana_url, c.tema_semana_pdf_url, 'sistema@migracion'
FROM public.configuracion_iglesia c
WHERE (c.tema_semana_titulo IS NOT NULL AND c.tema_semana_titulo <> '')
   OR (c.tema_semana_descripcion IS NOT NULL AND c.tema_semana_descripcion <> '')
   OR (c.tema_semana_pdf_url IS NOT NULL AND c.tema_semana_pdf_url <> '')
   OR (c.tema_semana_url IS NOT NULL AND c.tema_semana_url <> '')
LIMIT 1
ON CONFLICT DO NOTHING;
