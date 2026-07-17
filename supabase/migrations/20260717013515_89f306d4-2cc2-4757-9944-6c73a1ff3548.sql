
-- Audit trigger for reportes_grupos & planificaciones_grupo creation
CREATE OR REPLACE FUNCTION public.audit_grupo_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_op text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  EXCEPTION WHEN OTHERS THEN v_email := NULL; END;

  v_op := CASE TG_TABLE_NAME
    WHEN 'reportes_grupos' THEN 'CDP_REPORT_CREATED'
    WHEN 'planificaciones_grupo' THEN 'CDP_PLAN_CREATED'
    ELSE 'CDP_ACTION'
  END;

  INSERT INTO public.security_audit_log
    (table_name, operation, row_id, actor_user_id, actor_email, changed, old_row, new_row)
  VALUES (
    TG_TABLE_NAME,
    v_op,
    NEW.id::text,
    v_uid,
    v_email,
    jsonb_build_object(
      'grupo_id', NEW.grupo_id,
      'fecha', to_jsonb(NEW)->'fecha',
      'created_at', now()
    ),
    NULL,
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_reporte_grupo_insert ON public.reportes_grupos;
CREATE TRIGGER trg_audit_reporte_grupo_insert
AFTER INSERT ON public.reportes_grupos
FOR EACH ROW EXECUTE FUNCTION public.audit_grupo_action();

DROP TRIGGER IF EXISTS trg_audit_planificacion_grupo_insert ON public.planificaciones_grupo;
CREATE TRIGGER trg_audit_planificacion_grupo_insert
AFTER INSERT ON public.planificaciones_grupo
FOR EACH ROW EXECUTE FUNCTION public.audit_grupo_action();
