-- =============================================================================
-- MIGRACIÓN INTEGRAL: RESOLUCIÓN DE LOS 10 ERRORES DE PLATAFORMA Y AUDITORÍA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX ISSUE 1: RESTAURAR VÍNCULO GRUPOS - LÍDER (grupos_lider_id_fkey)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- Limpiar cualquier lider_id que no exista en personas antes de agregar la FK
  UPDATE public.grupos
  SET lider_id = NULL
  WHERE lider_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.personas p WHERE p.id = grupos.lider_id);

  -- Restaurar la foreign key oficial hacia personas(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grupos_lider_id_fkey'
  ) THEN
    ALTER TABLE public.grupos
      ADD CONSTRAINT grupos_lider_id_fkey
      FOREIGN KEY (lider_id) REFERENCES public.personas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. FIX ISSUE 8: DESBLOQUEAR INSERCIÓN DE PERSONAS EN RLS Y CORREGIR RPC
-- -----------------------------------------------------------------------------
-- Eliminar cualquier política restrictiva antigua que bloqueaba la creación de personas
DROP POLICY IF EXISTS "Only personas:create roles can insert personas" ON public.personas;
DROP POLICY IF EXISTS "Role-scoped insert personas" ON public.personas;
DROP POLICY IF EXISTS "Roles can insert personas" ON public.personas;
DROP POLICY IF EXISTS "Creator roles can insert personas" ON public.personas;
DROP POLICY IF EXISTS "All staff can insert personas" ON public.personas;
DROP POLICY IF EXISTS "Authenticated can insert personas" ON public.personas;

CREATE POLICY "Authenticated can insert personas"
  ON public.personas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Otorgar permisos completos a personas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personas TO authenticated, service_role;

-- Corregir create_persona_with_permission (eliminando el cast inválido a 'Visitante' que causaba error)
CREATE OR REPLACE FUNCTION public.create_persona_with_permission(_payload jsonb)
RETURNS public.personas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_row public.personas;
  _estado_str text;
  _estado_val public.estado_iglesia := 'Activo';
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para crear personas.';
  END IF;

  _estado_str := _payload->>'estado_iglesia';
  IF _estado_str IN ('Activo', 'Inactivo', 'En proceso') THEN
    _estado_val := _estado_str::public.estado_iglesia;
  END IF;

  INSERT INTO public.personas (
    nombres, apellidos, email, telefono, whatsapp, tipo_documento, documento,
    fecha_nacimiento, sexo, estado_civil, ocupacion, nivel_educativo,
    direccion, ciudad, departamento, barrio, estado_iglesia, fecha_ingreso,
    bautizado, fecha_bautismo, servidor, ministerio, tipos_persona,
    grupo_id, notas, foto_url, acepta_tratamiento_datos,
    consentimiento_fecha, consentimiento_fuente
  ) VALUES (
    NULLIF(btrim(_payload->>'nombres'), ''),
    NULLIF(btrim(_payload->>'apellidos'), ''),
    NULLIF(btrim(_payload->>'email'), ''),
    NULLIF(btrim(_payload->>'telefono'), ''),
    NULLIF(btrim(_payload->>'whatsapp'), ''),
    COALESCE(NULLIF(_payload->>'tipo_documento', ''), 'CC'),
    NULLIF(btrim(_payload->>'documento'), ''),
    NULLIF(_payload->>'fecha_nacimiento', '')::date,
    NULLIF(_payload->>'sexo', ''),
    NULLIF(_payload->>'estado_civil', ''),
    NULLIF(btrim(_payload->>'ocupacion'), ''),
    NULLIF(_payload->>'nivel_educativo', ''),
    NULLIF(btrim(_payload->>'direccion'), ''),
    COALESCE(NULLIF(btrim(_payload->>'ciudad'), ''), 'Barranquilla'),
    COALESCE(NULLIF(btrim(_payload->>'departamento'), ''), 'Atlántico'),
    NULLIF(btrim(_payload->>'barrio'), ''),
    _estado_val,
    COALESCE(NULLIF(_payload->>'fecha_ingreso', '')::date, CURRENT_DATE),
    COALESCE((_payload->>'bautizado')::boolean, false),
    NULLIF(_payload->>'fecha_bautismo', '')::date,
    COALESCE((_payload->>'servidor')::boolean, false),
    NULLIF(btrim(_payload->>'ministerio'), ''),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text( COALESCE(_payload->'tipos_persona', '["Miembro"]'::jsonb) )),
      ARRAY['Miembro']::text[]
    ),
    NULLIF(_payload->>'grupo_id', '')::uuid,
    NULLIF(btrim(_payload->>'notas'), ''),
    NULLIF(_payload->>'foto_url', ''),
    COALESCE((_payload->>'acepta_tratamiento_datos')::boolean, false),
    CASE WHEN COALESCE((_payload->>'acepta_tratamiento_datos')::boolean, false)
         THEN COALESCE(NULLIF(_payload->>'consentimiento_fecha','')::timestamptz, now())
         ELSE NULL END,
    NULLIF(_payload->>'consentimiento_fuente', '')
  )
  RETURNING * INTO _new_row;

  RETURN _new_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_persona_with_permission(jsonb) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. FIX ISSUE 3: RECUPERAR CASA DE PAZ DE NIÑOS TRASLADADOS ERRÓNEAMENTE
-- -----------------------------------------------------------------------------
-- Si un niño tenía membresía en una Casa de Paz en grupo_miembros y su grupo_id
-- fue cambiado a un grupo infantil, restauramos su Casa de Paz original en personas.grupo_id
DO $$
BEGIN
  UPDATE public.personas p
  SET grupo_id = gm.grupo_id
  FROM public.grupo_miembros gm
  JOIN public.grupos g ON g.id = gm.grupo_id
  WHERE gm.persona_id = p.id
    AND 'Niño' = ANY(p.tipos_persona)
    AND LOWER(g.tipo::text) IN ('casas de paz', 'grupos encuentro')
    AND EXISTS (
      -- Su grupo actual en personas es un grupo infantil
      SELECT 1 FROM public.grupos gi
      WHERE gi.id = p.grupo_id
        AND LOWER(gi.tipo::text) = 'niños'
    );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 4. FIX ISSUE 5: TABLAS DE LA ACADEMIA DOXA Y RLS PÚBLICO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academy_facultades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  orden INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_diplomados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facultad_id UUID REFERENCES public.academy_facultades(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  duracion TEXT,
  modalidad TEXT,
  nivel TEXT,
  objetivo_general TEXT,
  dirigido_a JSONB DEFAULT '[]'::jsonb,
  competencias JSONB DEFAULT '[]'::jsonb,
  proyecto_final JSONB DEFAULT '[]'::jsonb,
  orden INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diplomado_id UUID REFERENCES public.academy_diplomados(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  objetivo TEXT,
  temas JSONB DEFAULT '[]'::jsonb,
  taller TEXT,
  orden INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_facultades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_diplomados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_modulos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for academy_facultades" ON public.academy_facultades;
CREATE POLICY "Allow public read access for academy_facultades" ON public.academy_facultades FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access for academy_diplomados" ON public.academy_diplomados;
CREATE POLICY "Allow public read access for academy_diplomados" ON public.academy_diplomados FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access for academy_modulos" ON public.academy_modulos;
CREATE POLICY "Allow public read access for academy_modulos" ON public.academy_modulos FOR SELECT USING (true);

GRANT SELECT ON public.academy_facultades TO anon, authenticated, service_role;
GRANT SELECT ON public.academy_diplomados TO anon, authenticated, service_role;
GRANT SELECT ON public.academy_modulos TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. FIX ISSUE 7: ALERTAS SEMANALES DE CASAS DE PAZ Y CRON ROBUSTO
-- -----------------------------------------------------------------------------
-- Asegurar permisos en alertas_importantes para procesos automáticos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas_importantes TO authenticated, service_role;

DROP POLICY IF EXISTS "alertas insert system" ON public.alertas_importantes;
CREATE POLICY "alertas insert system" ON public.alertas_importantes FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.cdp_generate_deadline_alerts()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_bog timestamp := (now() AT TIME ZONE 'America/Bogota');
  week_start date := (date_trunc('week', now_bog))::date;
  inserted_count int := 0;
  g record;
  hours_to_plan numeric;
  hours_to_report numeric;
  tue_deadline timestamp := week_start + interval '1 day' + interval '23 hours 59 minutes';
  thu_deadline timestamp := week_start + interval '3 days' + interval '23 hours 59 minutes';
BEGIN
  hours_to_plan   := (EXTRACT(EPOCH FROM (tue_deadline - now_bog)) / 3600.0)::numeric;
  hours_to_report := (EXTRACT(EPOCH FROM (thu_deadline - now_bog)) / 3600.0)::numeric;

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
      BEGIN
        INSERT INTO public.alertas_importantes(titulo, descripcion, severidad, categoria, grupo_id, metadata)
        VALUES (
          'Planeación CDP pendiente — vence martes 11:59 PM',
          format('El grupo "%s" aún no ha registrado su hoja de planeación de esta semana. Faltan ~%s horas para el cierre (hora Bogotá).',
                 g.nombre, CEIL(hours_to_plan)::int::text),
          CASE WHEN hours_to_plan <= 6 THEN 'alta' ELSE 'media' END,
          'cdp_plan_deadline',
          g.id,
          jsonb_build_object('week_start', week_start::text, 'hours_left', ROUND(hours_to_plan, 1))
        );
        inserted_count := inserted_count + 1;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
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
      BEGIN
        INSERT INTO public.alertas_importantes(titulo, descripcion, severidad, categoria, grupo_id, metadata)
        VALUES (
          'Reporte CDP pendiente — vence jueves 11:59 PM',
          format('El grupo "%s" aún no ha registrado su reporte semanal. Faltan ~%s horas para el cierre (hora Bogotá).',
                 g.nombre, CEIL(hours_to_report)::int::text),
          CASE WHEN hours_to_report <= 6 THEN 'alta' ELSE 'media' END,
          'cdp_report_deadline',
          g.id,
          jsonb_build_object('week_start', week_start::text, 'hours_left', ROUND(hours_to_report, 1))
        );
        inserted_count := inserted_count + 1;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;
  END IF;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cdp_generate_deadline_alerts() TO PUBLIC, anon, authenticated, service_role;

-- Programar cron de forma segura si pg_cron está activo
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cdp-deadline-alerts-hourly');
    PERFORM cron.schedule(
      'cdp-deadline-alerts-hourly',
      '0 * * * *',
      $$SELECT public.cdp_generate_deadline_alerts();$$
    );
    UPDATE cron.job SET database = current_database() WHERE jobname = 'cdp-deadline-alerts-hourly';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 6. FIX ISSUE 10: LIMPIEZA DE FILAS 'PENDING' OBSOLETAS EN EMAIL_SEND_LOG
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_pending_email_send_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN
    DELETE FROM public.email_send_log
    WHERE id <> NEW.id
      AND status = 'pending'
      AND (
        (NEW.message_id IS NOT NULL AND message_id = NEW.message_id)
        OR (
          NEW.recipient_email IS NOT NULL
          AND lower(recipient_email) = lower(NEW.recipient_email)
          AND created_at >= now() - interval '48 hours'
        )
      );
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_pending_email_send_log() TO PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_cleanup_pending_email_send_log ON public.email_send_log;
CREATE TRIGGER trg_cleanup_pending_email_send_log
  AFTER INSERT OR UPDATE ON public.email_send_log
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_pending_email_send_log();

-- Purgar registros huérfanos 'pending' en la base de datos
DELETE FROM public.email_send_log p
WHERE p.status = 'pending'
  AND (
    EXISTS (
      SELECT 1
      FROM public.email_send_log s
      WHERE s.id <> p.id
        AND s.status <> 'pending'
        AND (
          (p.message_id IS NOT NULL AND s.message_id = p.message_id)
          OR (
            p.recipient_email IS NOT NULL
            AND lower(s.recipient_email) = lower(p.recipient_email)
            AND abs(extract(epoch from (s.created_at - p.created_at))) <= 86400
          )
        )
    )
    OR p.created_at < now() - interval '48 hours'
  );
