
-- 1. Ampliar operaciones de auditoría
ALTER TABLE public.security_audit_log DROP CONSTRAINT IF EXISTS security_audit_log_operation_check;
ALTER TABLE public.security_audit_log ADD CONSTRAINT security_audit_log_operation_check CHECK (operation = ANY (ARRAY[
  'INSERT','UPDATE','DELETE',
  'CDP_REPORT_CREATED','CDP_REPORT_UPDATED','CDP_REPORT_DELETED',
  'CDP_PLAN_CREATED','CDP_PLAN_UPDATED','CDP_PLAN_DELETED',
  'CDP_PLAN_BLOCKED','CDP_REPORT_BLOCKED','CDP_DEADLINE_ALERT',
  'CDP_ACTION','CHECKIN','ATTENDANCE_MARK','EXPORT_FICHA','EXPORT_HISTORIAL',
  'CERTIFICATE_ISSUED','PROFILE_QUICK_ACTION','LOAD_FAILURE'
]));

-- 2. RPC para registrar intentos fallidos por deadline (llamado desde el cliente al capturar el error)
CREATE OR REPLACE FUNCTION public.log_cdp_deadline_block(
  p_kind text,           -- 'plan' | 'report'
  p_grupo_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_op text;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  v_op := CASE WHEN p_kind = 'plan' THEN 'CDP_PLAN_BLOCKED' ELSE 'CDP_REPORT_BLOCKED' END;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.security_audit_log(table_name, operation, row_id, actor_user_id, actor_email, changed, new_row)
  VALUES (
    CASE WHEN p_kind = 'plan' THEN 'planificaciones_grupo' ELSE 'reportes_grupos' END,
    v_op,
    p_grupo_id::text,
    auth.uid(),
    v_email,
    jsonb_build_object('reason', p_reason, 'bogota_now', (now() AT TIME ZONE 'America/Bogota')::text),
    jsonb_build_object('grupo_id', p_grupo_id, 'reason', p_reason)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_cdp_deadline_block(text, uuid, text) TO authenticated;

-- 3. Extender triggers para dejar traza (via dblink-less approach: emitir NOTICE + intentar log en tabla separada no es viable
--    porque el RAISE hace rollback). El logging ocurre desde el cliente en el catch. Solo aseguramos el mensaje.

-- 4. Función que genera alertas para líderes X horas antes de cada deadline (idempotente por semana y grupo)
CREATE OR REPLACE FUNCTION public.cdp_generate_deadline_alerts()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_bog timestamp := (now() AT TIME ZONE 'America/Bogota');
  dow int := EXTRACT(DOW FROM now_bog)::int;
  hh int := EXTRACT(HOUR FROM now_bog)::int;
  week_start date := (date_trunc('week', now_bog))::date; -- lunes
  inserted_count int := 0;
  g record;
  hours_to_plan int;   -- hasta martes 23:59
  hours_to_report int; -- hasta jueves 23:59
  tue_deadline timestamp := week_start + interval '1 day' + interval '23 hours 59 minutes';
  thu_deadline timestamp := week_start + interval '3 days' + interval '23 hours 59 minutes';
BEGIN
  hours_to_plan   := EXTRACT(EPOCH FROM (tue_deadline - now_bog))/3600;
  hours_to_report := EXTRACT(EPOCH FROM (thu_deadline - now_bog))/3600;

  -- PLANIFICACIONES: notificar cuando faltan <=24h y aún no hay plan de esta semana
  IF hours_to_plan > 0 AND hours_to_plan <= 24 THEN
    FOR g IN
      SELECT gr.id, gr.nombre, gr.red
      FROM public.grupos gr
      WHERE gr.tipo::text IN ('Casas de paz','Grupos encuentro')
        AND gr.estado = 'Activo'
        AND NOT EXISTS (
          SELECT 1 FROM public.planificaciones_grupo p
          WHERE p.grupo_id = gr.id
            AND (p.created_at AT TIME ZONE 'America/Bogota')::date >= week_start
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.alertas_importantes a
          WHERE a.grupo_id = gr.id
            AND a.categoria = 'cdp_plan_deadline'
            AND a.metadata->>'week_start' = week_start::text
        )
    LOOP
      INSERT INTO public.alertas_importantes(titulo, descripcion, severidad, categoria, grupo_id, metadata)
      VALUES (
        'Planeación CDP pendiente — vence martes 11:59 PM',
        format('El grupo "%s" (%s) aún no ha registrado su hoja de planeación de esta semana. Faltan ~%s horas para el cierre (hora Bogotá).',
               g.nombre, COALESCE(g.red,'—'), CEIL(hours_to_plan)::text),
        CASE WHEN hours_to_plan <= 6 THEN 'alta' ELSE 'media' END,
        'cdp_plan_deadline',
        g.id,
        jsonb_build_object('week_start', week_start, 'hours_left', hours_to_plan)
      );
      inserted_count := inserted_count + 1;
    END LOOP;
  END IF;

  -- REPORTES: notificar cuando faltan <=24h y aún no hay reporte de esta semana
  IF hours_to_report > 0 AND hours_to_report <= 24 THEN
    FOR g IN
      SELECT gr.id, gr.nombre, gr.red
      FROM public.grupos gr
      WHERE gr.tipo::text IN ('Casas de paz','Grupos encuentro')
        AND gr.estado = 'Activo'
        AND NOT EXISTS (
          SELECT 1 FROM public.reportes_grupos r
          WHERE r.grupo_id = gr.id
            AND r.fecha >= week_start
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.alertas_importantes a
          WHERE a.grupo_id = gr.id
            AND a.categoria = 'cdp_report_deadline'
            AND a.metadata->>'week_start' = week_start::text
        )
    LOOP
      INSERT INTO public.alertas_importantes(titulo, descripcion, severidad, categoria, grupo_id, metadata)
      VALUES (
        'Reporte CDP pendiente — vence jueves 11:59 PM',
        format('El grupo "%s" (%s) aún no ha registrado su reporte semanal. Faltan ~%s horas para el cierre (hora Bogotá).',
               g.nombre, COALESCE(g.red,'—'), CEIL(hours_to_report)::text),
        CASE WHEN hours_to_report <= 6 THEN 'alta' ELSE 'media' END,
        'cdp_report_deadline',
        g.id,
        jsonb_build_object('week_start', week_start, 'hours_left', hours_to_report)
      );
      inserted_count := inserted_count + 1;
    END LOOP;
  END IF;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cdp_generate_deadline_alerts() TO authenticated, service_role;

-- 5. Programar en pg_cron: cada hora
DO $$ BEGIN
  PERFORM cron.unschedule('cdp-deadline-alerts-hourly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'cdp-deadline-alerts-hourly',
  '0 * * * *',
  $$SELECT public.cdp_generate_deadline_alerts();$$
);
