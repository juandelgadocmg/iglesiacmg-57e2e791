-- Fix CDP Deadline Alerts function and cleanup email queue logs

-- 1. Fix cdp_generate_deadline_alerts to prevent 'CEIL(integer) does not exist' runtime error
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
  hours_to_plan numeric;   -- hasta martes 23:59
  hours_to_report numeric; -- hasta jueves 23:59
  tue_deadline timestamp := week_start + interval '1 day' + interval '23 hours 59 minutes';
  thu_deadline timestamp := week_start + interval '3 days' + interval '23 hours 59 minutes';
BEGIN
  hours_to_plan   := EXTRACT(EPOCH FROM (tue_deadline - now_bog))/3600.0;
  hours_to_report := EXTRACT(EPOCH FROM (thu_deadline - now_bog))/3600.0;

  -- PLANIFICACIONES: notificar cuando faltan <=24h y aún no hay plan de esta semana
  IF hours_to_plan > 0 AND hours_to_plan <= 24 THEN
    FOR g IN
      SELECT gr.id, gr.nombre, gr.red
      FROM public.grupos gr
      WHERE LOWER(gr.tipo::text) IN ('casas de paz', 'grupos encuentro')
        AND (gr.estado IS NULL OR gr.estado = 'Activo')
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
               g.nombre, COALESCE(g.red,'—'), CEIL(hours_to_plan)::int::text),
        CASE WHEN hours_to_plan <= 6 THEN 'alta' ELSE 'media' END,
        'cdp_plan_deadline',
        g.id,
        jsonb_build_object('week_start', week_start::text, 'hours_left', hours_to_plan)
      );
      inserted_count := inserted_count + 1;
    END LOOP;
  END IF;

  -- REPORTES: notificar cuando faltan <=24h y aún no hay reporte de esta semana
  IF hours_to_report > 0 AND hours_to_report <= 24 THEN
    FOR g IN
      SELECT gr.id, gr.nombre, gr.red
      FROM public.grupos gr
      WHERE LOWER(gr.tipo::text) IN ('casas de paz', 'grupos encuentro')
        AND (gr.estado IS NULL OR gr.estado = 'Activo')
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
               g.nombre, COALESCE(g.red,'—'), CEIL(hours_to_report)::int::text),
        CASE WHEN hours_to_report <= 6 THEN 'alta' ELSE 'media' END,
        'cdp_report_deadline',
        g.id,
        jsonb_build_object('week_start', week_start::text, 'hours_left', hours_to_report)
      );
      inserted_count := inserted_count + 1;
    END LOOP;
  END IF;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cdp_generate_deadline_alerts() TO authenticated, service_role;

-- 2. Cleanup existing pending email log entries that have sent/failed counterparts
DELETE FROM public.email_send_log p
WHERE p.status = 'pending'
  AND p.message_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.email_send_log s
    WHERE s.message_id = p.message_id
      AND s.status IN ('sent', 'failed', 'dlq', 'rate_limited')
  );

-- 3. Function to update email send log status safely
CREATE OR REPLACE FUNCTION public.update_email_send_log_status(
  p_message_id text,
  p_status text,
  p_template_name text DEFAULT NULL,
  p_recipient_email text DEFAULT NULL,
  p_error_message text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_message_id IS NULL THEN
    INSERT INTO public.email_send_log (template_name, recipient_email, status, error_message)
    VALUES (COALESCE(p_template_name, 'transactional'), COALESCE(p_recipient_email, ''), p_status, p_error_message);
    RETURN;
  END IF;

  UPDATE public.email_send_log
  SET status = p_status,
      error_message = COALESCE(p_error_message, error_message),
      created_at = now()
  WHERE message_id = p_message_id;

  IF NOT FOUND THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message)
    VALUES (p_message_id, COALESCE(p_template_name, 'transactional'), COALESCE(p_recipient_email, ''), p_status, p_error_message);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_email_send_log_status(text, text, text, text, text) TO authenticated, service_role;
