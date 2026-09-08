-- Fix cdp_generate_deadline_alerts numeric rounding

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
  -- We extract epoch to numeric.
  hours_to_plan   := (EXTRACT(EPOCH FROM (tue_deadline - now_bog))/3600.0)::numeric;
  hours_to_report := (EXTRACT(EPOCH FROM (thu_deadline - now_bog))/3600.0)::numeric;

  -- PLANIFICACIONES: notificar cuando faltan <=24h y aún no hay plan de esta semana
  IF hours_to_plan > 0 AND hours_to_plan <= 24 THEN
    FOR g IN
      SELECT gr.id, gr.nombre
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
        format('El grupo "%s" aún no ha registrado su hoja de planeación de esta semana. Faltan ~%s horas para el cierre (hora Bogotá).',
               g.nombre, ROUND(hours_to_plan, 0)::text),
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
      SELECT gr.id, gr.nombre
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
        format('El grupo "%s" aún no ha registrado su reporte semanal. Faltan ~%s horas para el cierre (hora Bogotá).',
               g.nombre, ROUND(hours_to_report, 0)::text),
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
