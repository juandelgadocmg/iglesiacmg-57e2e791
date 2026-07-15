-- =====================================================================
-- Escaneo de funciones SECURITY DEFINER
-- Falla si aparece una función SECURITY DEFINER en schema public que:
--   a) sea EXECUTE-able por PUBLIC (cualquier autenticado / anon), y
--   b) NO tenga control interno (has_role / auth.uid() / RAISE EXCEPTION),
--      con lo cual podría convertirse en una ruta de escalación.
-- La lista blanca cubre funciones utilitarias intencionalmente abiertas.
-- =====================================================================

\set QUIET on
\pset pager off

DO $$
DECLARE
  r RECORD;
  v_body text;
  v_issues text := '';
  v_whitelist text[] := ARRAY[
    'update_updated_at_column',
    'handle_new_user',
    'prevent_duplicate_reporte_grupo_fecha',
    'audit_sensitive_change',
    'audit_profile_link_change',
    'cita_consejeria_intercesion',
    'sync_grupo_miembros_from_persona',
    'sem_inscripciones_set_user_id',
    'sem_sync_inscripciones_from_profile',
    'prevent_profile_persona_self_update',
    'sem_set_periodo_ingreso',
    'sem_audit_inscripcion_changes',
    'sem_msg_calificacion',
    'sem_msg_nueva_evaluacion',
    'sem_msg_welcome_inscripcion',
    'sem_msg_zoom_sesion',
    'msg_after_message_insert',
    'email_queue_wake',
    'email_queue_dispatch',
    'prog_send_reminders',
    'msg_process_scheduled'
  ];
BEGIN
  FOR r IN
    SELECT
      p.oid,
      p.proname,
      pg_get_functiondef(p.oid) AS def,
      has_function_privilege('public', p.oid, 'EXECUTE') AS public_exec,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    IF r.proname = ANY(v_whitelist) THEN
      CONTINUE;
    END IF;

    v_body := lower(r.def);

    -- Debe tener alguna barrera: has_role / sem_is_staff / sem_is_tesoreria /
    -- auth.uid() en un WHERE, o RAISE EXCEPTION explícito.
    IF (r.public_exec OR r.auth_exec)
       AND v_body !~ 'has_role\('
       AND v_body !~ 'sem_is_staff\('
       AND v_body !~ 'sem_is_tesoreria\('
       AND v_body !~ 'raise\s+exception'
       AND v_body !~ 'auth\.uid\(\)'
    THEN
      v_issues := v_issues || format(E'  - %s (public_exec=%s, auth_exec=%s) sin control interno\n',
        r.proname, r.public_exec, r.auth_exec);
    END IF;
  END LOOP;

  IF v_issues <> '' THEN
    RAISE EXCEPTION E'Funciones SECURITY DEFINER sin control de acceso detectadas:\n%\n\nAgrega has_role()/auth.uid()/RAISE EXCEPTION o inclúyelas en la lista blanca del scanner si son seguras por diseño.', v_issues;
  END IF;

  RAISE NOTICE 'OK — todas las funciones SECURITY DEFINER tienen control interno o están en la lista blanca.';
END;
$$;
