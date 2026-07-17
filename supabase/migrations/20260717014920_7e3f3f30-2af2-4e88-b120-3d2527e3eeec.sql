-- Extend allowed operations in audit log
ALTER TABLE public.security_audit_log DROP CONSTRAINT security_audit_log_operation_check;
ALTER TABLE public.security_audit_log ADD CONSTRAINT security_audit_log_operation_check
CHECK (operation = ANY (ARRAY[
  'INSERT','UPDATE','DELETE',
  'CDP_REPORT_CREATED','CDP_REPORT_UPDATED','CDP_REPORT_DELETED',
  'CDP_PLAN_CREATED','CDP_PLAN_UPDATED','CDP_PLAN_DELETED','CDP_ACTION',
  'CHECKIN','ATTENDANCE_MARK','EXPORT_FICHA','EXPORT_HISTORIAL',
  'CERTIFICATE_ISSUED','PROFILE_QUICK_ACTION','LOAD_FAILURE'
]));

-- Update trigger function to handle INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.audit_grupo_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_op text;
  v_row_id text;
  v_grupo_id uuid;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  EXCEPTION WHEN OTHERS THEN v_email := NULL; END;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD); v_new := NULL;
    v_row_id := OLD.id::text; v_grupo_id := OLD.grupo_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
    v_row_id := NEW.id::text; v_grupo_id := NEW.grupo_id;
  ELSE
    v_old := NULL; v_new := to_jsonb(NEW);
    v_row_id := NEW.id::text; v_grupo_id := NEW.grupo_id;
  END IF;

  v_op := CASE TG_TABLE_NAME
    WHEN 'reportes_grupos' THEN
      CASE TG_OP WHEN 'INSERT' THEN 'CDP_REPORT_CREATED'
                 WHEN 'UPDATE' THEN 'CDP_REPORT_UPDATED'
                 WHEN 'DELETE' THEN 'CDP_REPORT_DELETED' END
    WHEN 'planificaciones_grupo' THEN
      CASE TG_OP WHEN 'INSERT' THEN 'CDP_PLAN_CREATED'
                 WHEN 'UPDATE' THEN 'CDP_PLAN_UPDATED'
                 WHEN 'DELETE' THEN 'CDP_PLAN_DELETED' END
    ELSE 'CDP_ACTION'
  END;

  INSERT INTO public.security_audit_log
    (table_name, operation, row_id, actor_user_id, actor_email, changed, old_row, new_row)
  VALUES (
    TG_TABLE_NAME, v_op, v_row_id, v_uid, v_email,
    jsonb_build_object('grupo_id', v_grupo_id, 'at', now()),
    v_old, v_new
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Add UPDATE/DELETE audit triggers
DROP TRIGGER IF EXISTS trg_audit_reporte_grupo_update ON public.reportes_grupos;
CREATE TRIGGER trg_audit_reporte_grupo_update
AFTER UPDATE ON public.reportes_grupos
FOR EACH ROW EXECUTE FUNCTION public.audit_grupo_action();

DROP TRIGGER IF EXISTS trg_audit_reporte_grupo_delete ON public.reportes_grupos;
CREATE TRIGGER trg_audit_reporte_grupo_delete
AFTER DELETE ON public.reportes_grupos
FOR EACH ROW EXECUTE FUNCTION public.audit_grupo_action();

DROP TRIGGER IF EXISTS trg_audit_planificacion_grupo_update ON public.planificaciones_grupo;
CREATE TRIGGER trg_audit_planificacion_grupo_update
AFTER UPDATE ON public.planificaciones_grupo
FOR EACH ROW EXECUTE FUNCTION public.audit_grupo_action();

DROP TRIGGER IF EXISTS trg_audit_planificacion_grupo_delete ON public.planificaciones_grupo;
CREATE TRIGGER trg_audit_planificacion_grupo_delete
AFTER DELETE ON public.planificaciones_grupo
FOR EACH ROW EXECUTE FUNCTION public.audit_grupo_action();