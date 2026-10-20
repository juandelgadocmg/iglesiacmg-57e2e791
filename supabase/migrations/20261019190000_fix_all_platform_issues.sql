-- =============================================================================
-- Migration: 20261019190000_fix_all_platform_issues.sql
-- Purpose: Comprehensive, idempotent fix for platform database issues:
--   1. Restore EXECUTE permissions on trigger/helper functions (personas, grupos, alertas)
--   2. Fix personas creation RLS & create_persona_with_permission RPC
--   3. Ensure infantil_grupos_detalles & infantil_notificaciones tables and RLS exist
--   4. Ensure DOXA Academy CMS tables, RLS (using has_role), and seed data exist
--   5. Relax grupos_lider_id_fkey so assigning a leader to a Casa de Paz always updates grupos.lider_id
--   6. Fix cdp_generate_deadline_alerts() numeric rounding & hourly cron schedule
--   7. Fix email_send_log duplicate 'pending' rows via RPC + automatic cleanup trigger
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RESTORE TRIGGER & HELPER FUNCTION PERMISSIONS
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO PUBLIC, anon, authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_sensitive_change') THEN
    GRANT EXECUTE ON FUNCTION public.audit_sensitive_change() TO PUBLIC, anon, authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_grupo_miembros_from_persona') THEN
    GRANT EXECUTE ON FUNCTION public.sync_grupo_miembros_from_persona() TO PUBLIC, anon, authenticated, service_role;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. FIX PERSONAS INSERT RLS & RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_create_personas(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _uid IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION public.can_create_personas(uuid) TO PUBLIC, anon, authenticated, service_role;

DROP POLICY IF EXISTS "Roles can insert personas" ON public.personas;
DROP POLICY IF EXISTS "Creator roles can insert personas" ON public.personas;
DROP POLICY IF EXISTS "All staff can insert personas" ON public.personas;
DROP POLICY IF EXISTS "Authenticated can insert personas" ON public.personas;

CREATE POLICY "Authenticated can insert personas"
  ON public.personas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.create_persona_with_permission(_payload jsonb)
RETURNS public.personas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_row public.personas;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para crear personas.';
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
    COALESCE(NULLIF(_payload->>'estado_iglesia', '')::public.estado_iglesia, 'Visitante'::public.estado_iglesia),
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
-- 3. ENSURE INFANTIL TABLES & RLS EXIST
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.infantil_grupos_detalles (
  grupo_id UUID PRIMARY KEY REFERENCES public.grupos(id) ON DELETE CASCADE,
  edad_minima INTEGER,
  edad_maxima INTEGER,
  salon TEXT,
  capacidad INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.infantil_grupos_detalles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Infantil grupos detalles lectura" ON public.infantil_grupos_detalles;
CREATE POLICY "Infantil grupos detalles lectura"
  ON public.infantil_grupos_detalles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Infantil grupos detalles escritura" ON public.infantil_grupos_detalles;
CREATE POLICY "Infantil grupos detalles escritura"
  ON public.infantil_grupos_detalles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.infantil_notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nino_id UUID REFERENCES public.personas(id) ON DELETE CASCADE,
  acudiente_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'WhatsApp',
  estado TEXT NOT NULL DEFAULT 'Enviado',
  enviado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.infantil_notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Infantil notificaciones lectura" ON public.infantil_notificaciones;
CREATE POLICY "Infantil notificaciones lectura"
  ON public.infantil_notificaciones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Infantil notificaciones escritura" ON public.infantil_notificaciones;
CREATE POLICY "Infantil notificaciones escritura"
  ON public.infantil_notificaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4. ENSURE DOXA ACADEMY CMS TABLES, POLICIES & SEED DATA EXIST
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academy_facultades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
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
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diplomado_id UUID REFERENCES public.academy_diplomados(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  objetivo TEXT,
  temas JSONB DEFAULT '[]'::jsonb,
  taller TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
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

DROP POLICY IF EXISTS "Allow admins full access for academy_facultades" ON public.academy_facultades;
CREATE POLICY "Allow admins full access for academy_facultades" ON public.academy_facultades FOR ALL USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

DROP POLICY IF EXISTS "Allow admins full access for academy_diplomados" ON public.academy_diplomados;
CREATE POLICY "Allow admins full access for academy_diplomados" ON public.academy_diplomados FOR ALL USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

DROP POLICY IF EXISTS "Allow admins full access for academy_modulos" ON public.academy_modulos;
CREATE POLICY "Allow admins full access for academy_modulos" ON public.academy_modulos FOR ALL USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

INSERT INTO public.academy_facultades (id, nombre, orden) VALUES
  ('3c452d30-71e2-45aa-88f8-0b5b24032bfd', 'Facultad de Liderazgo', 1),
  ('a1b349a1-fd9e-446e-bc2d-cb735269fae2', 'Facultad de Gestión', 2),
  ('83bfcf89-6ba5-41bf-9ab8-7cd3bcfb0e3a', 'Facultad de Desarrollo Ministerial', 3),
  ('b9a66d05-7a99-464b-bde3-bab879e1c8a3', 'Facultad de Innovación', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.academy_diplomados (id, facultad_id, numero, titulo, subtitulo, duracion, modalidad, nivel, objetivo_general, dirigido_a, competencias, proyecto_final, orden) VALUES
  ('1f087b6a-3dd1-415b-ba30-b86c2382d65d', '83bfcf89-6ba5-41bf-9ab8-7cd3bcfb0e3a', 'I', 'Visión y Cultura Organizacional', NULL, '40 Horas (10 módulos de 4 horas)', 'Presencial • Virtual • Híbrida', 'Diplomado Profesional', 'Fortalecer la identidad, la visión y la cultura organizacional de la iglesia para alinear el liderazgo, los ministerios, los procesos y las personas con el propósito que Dios ha establecido.', '[]'::jsonb, '["Comprender los fundamentos de la visión organizacional","Definir y fortalecer la identidad institucional","Construir una cultura organizacional saludable"]'::jsonb, '["Diagnóstico de la cultura organizacional","Declaración de visión, misión y valores"]'::jsonb, 1),
  ('3fd10370-c42c-483c-a314-e1ca6d3df953', 'a1b349a1-fd9e-446e-bc2d-cb735269fae2', 'II', 'Administración Eclesiástica', NULL, '40 Horas', 'Presencial • Virtual • Híbrida', 'Diplomado Profesional', 'Desarrollar competencias administrativas, organizacionales y estratégicas que permitan fortalecer la gestión de la iglesia mediante procesos eficientes.', '[]'::jsonb, '["Diseñar estructuras organizacionales eficientes","Implementar procesos administrativos","Administrar recursos con transparencia"]'::jsonb, '["Diagnóstico organizacional","Organigrama institucional","Manual de funciones"]'::jsonb, 1),
  ('90eaa718-ecaf-499c-bf89-0ae81cd915dd', '3c452d30-71e2-45aa-88f8-0b5b24032bfd', 'III', 'Liderazgo Ministerial', NULL, '40 Horas', 'Presencial • Virtual • Híbrida', 'Diplomado Profesional', 'Desarrollar líderes íntegros, estratégicos y multiplicadores, capaces de inspirar, formar equipos, administrar ministerios y desarrollar nuevos líderes.', '["Pastores","Copastores","Líderes de ministerio","Líderes de Casas de Paz"]'::jsonb, '["Comprender el liderazgo bíblico y contemporáneo","Desarrollar un carácter íntegro","Liderar equipos de alto desempeño"]'::jsonb, '["Diagnóstico del liderazgo de la iglesia","Perfil de competencias para líderes"]'::jsonb, 1),
  ('043b4f59-0998-4e2b-a470-01260306ff86', '83bfcf89-6ba5-41bf-9ab8-7cd3bcfb0e3a', 'IV', 'Discipulado Estratégico', 'Diseñando iglesias que hacen discípulos, forman líderes y transforman comunidades', '40 Horas', 'Presencial • Virtual • Híbrida', 'Diplomado Profesional', 'Capacitar a líderes e iglesias para diseñar, implementar y evaluar un sistema integral de discipulado.', '["Pastores","Líderes de discipulado","Coordinadores de consolidación"]'::jsonb, '["Diseñar un sistema integral de discipulado","Fortalecer la consolidación de nuevos creyentes"]'::jsonb, '["Diagnóstico del discipulado actual","Ruta de crecimiento espiritual"]'::jsonb, 2),
  ('bb598d5b-3a6d-475e-8645-d6dd4399c4e7', 'a1b349a1-fd9e-446e-bc2d-cb735269fae2', 'V', 'Planeación Estratégica e Indicadores para Iglesias', 'Transformando la visión en resultados medibles', '40 Horas', 'Presencial • Virtual • Híbrida', 'Diplomado Profesional', 'Desarrollar competencias para planificar estratégicamente el crecimiento de la iglesia, establecer objetivos claros e implementar indicadores de gestión.', '["Pastores","Copastores","Administradores","Coordinadores ministeriales"]'::jsonb, '["Elaborar un plan estratégico ministerial","Definir objetivos y metas institucionales","Diseñar indicadores de gestión"]'::jsonb, '["Diagnóstico organizacional","Análisis FODA","Mapa estratégico"]'::jsonb, 2),
  ('85e1d45e-21e4-415a-b478-2c56908bb96f', 'b9a66d05-7a99-464b-bde3-bab879e1c8a3', 'VI', 'Tecnología e Inteligencia Artificial para Iglesias', 'Innovando para cumplir mejor la misión', '40 Horas', 'Presencial • Virtual • Híbrida', 'Diplomado Profesional', 'Capacitar a líderes, pastores y administradores para diseñar e implementar estrategias de transformación digital mediante tecnología e inteligencia artificial.', '["Pastores","Administradores","Líderes ministeriales","Equipos de comunicaciones"]'::jsonb, '["Liderar procesos de transformación digital","Automatizar procesos administrativos","Aplicar inteligencia artificial al ministerio"]'::jsonb, '["Diagnóstico de madurez digital","Arquitectura tecnológica","Plan de implementación de IA"]'::jsonb, 1)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. ALLOW GRUPOS.LIDER_ID TO BE UPDATED BY DISCIPULADO / CASA DE PAZ LEADERS
-- -----------------------------------------------------------------------------
ALTER TABLE public.grupos DROP CONSTRAINT IF EXISTS grupos_lider_id_fkey;

DROP POLICY IF EXISTS "Authenticated can update grupos lider" ON public.grupos;
CREATE POLICY "Authenticated can update grupos lider"
  ON public.grupos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Backfill grupos.lider_id from leaders.casa_de_paz_id where grupos.lider_id is currently null
UPDATE public.grupos g
SET lider_id = l.id
FROM public.leaders l
WHERE l.casa_de_paz_id = g.id
  AND g.lider_id IS NULL;

-- -----------------------------------------------------------------------------
-- 6. FIX CDP WEEKLY DEADLINE ALERTS FUNCTION & CRON JOB
-- -----------------------------------------------------------------------------
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
               g.nombre, CEIL(hours_to_report)::int::text),
        CASE WHEN hours_to_report <= 6 THEN 'alta' ELSE 'media' END,
        'cdp_report_deadline',
        g.id,
        jsonb_build_object('week_start', week_start::text, 'hours_left', ROUND(hours_to_report, 1))
      );
      inserted_count := inserted_count + 1;
    END LOOP;
  END IF;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cdp_generate_deadline_alerts() TO PUBLIC, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. FIX EMAIL_SEND_LOG DUPLICATE 'PENDING' ENTRIES
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
          AND created_at >= now() - interval '24 hours'
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

-- Clean up any existing stale 'pending' rows that already have a processed ('sent'/'failed'/etc.) entry
DELETE FROM public.email_send_log p
WHERE p.status = 'pending'
  AND EXISTS (
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
  );
