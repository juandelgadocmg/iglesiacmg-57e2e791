CREATE OR REPLACE FUNCTION public.log_grupo_load_failure(
  _grupo_id uuid,
  _section text,
  _error text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_section text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN; -- silently ignore anonymous
  END IF;
  v_section := lower(coalesce(_section, ''));
  IF v_section NOT IN ('detalle','miembros','estadisticas','reportes','mapa','planificaciones') THEN
    RAISE EXCEPTION 'section must be detalle/miembros/estadisticas/reportes/mapa/planificaciones';
  END IF;

  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  EXCEPTION WHEN OTHERS THEN v_email := NULL; END;

  INSERT INTO public.security_audit_log
    (table_name, operation, row_id, actor_user_id, actor_email, changed, old_row, new_row)
  VALUES (
    'grupos',
    'LOAD_FAILURE',
    coalesce(_grupo_id::text, 'null'),
    v_uid,
    v_email,
    jsonb_build_object(
      'grupo_id', _grupo_id,
      'section', v_section,
      'error', left(coalesce(_error, ''), 500)
    ),
    NULL,
    NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_grupo_load_failure(uuid, text, text) TO authenticated;