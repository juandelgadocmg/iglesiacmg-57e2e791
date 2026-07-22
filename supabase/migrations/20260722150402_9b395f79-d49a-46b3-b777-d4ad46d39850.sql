CREATE OR REPLACE FUNCTION public.tema_semana_vigente()
 RETURNS TABLE(id uuid, titulo text, descripcion text, url text, pdf_url text, fecha_inicio date, fecha_fin date, created_by_email text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.tema_semana_versiones%ROWTYPE;
BEGIN
  SELECT t.* INTO v_row FROM public.tema_semana_versiones t
   WHERE t.estado = 'activo'
     AND (t.fecha_inicio IS NULL OR t.fecha_inicio <= CURRENT_DATE)
     AND (t.fecha_fin IS NULL OR t.fecha_fin >= CURRENT_DATE)
   ORDER BY COALESCE(t.fecha_inicio, DATE '0001-01-01') DESC, t.created_at DESC
   LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    RETURN QUERY SELECT v_row.id, v_row.titulo, v_row.descripcion, v_row.url, v_row.pdf_url,
                        v_row.fecha_inicio, v_row.fecha_fin, v_row.created_by_email, v_row.created_at;
    RETURN;
  END IF;

  SELECT t.* INTO v_row FROM public.tema_semana_versiones t
   WHERE t.estado = 'activo'
   ORDER BY t.created_at DESC LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    RETURN QUERY SELECT v_row.id, v_row.titulo, v_row.descripcion, v_row.url, v_row.pdf_url,
                        v_row.fecha_inicio, v_row.fecha_fin, v_row.created_by_email, v_row.created_at;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT NULL::uuid, c.tema_semana_titulo, c.tema_semana_descripcion, c.tema_semana_url,
           c.tema_semana_pdf_url, NULL::date, NULL::date, NULL::text, NULL::timestamptz
    FROM public.configuracion_iglesia c LIMIT 1;
END;
$function$;