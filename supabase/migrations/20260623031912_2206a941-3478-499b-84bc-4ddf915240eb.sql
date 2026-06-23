
-- 1) Registro de auditoría de envíos masivos
CREATE TABLE IF NOT EXISTS public.msg_bulk_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid,
  sender_display text,
  scope_type text NOT NULL, -- 'role'|'oferta'|'programa'|'users'|'mixed'
  scope_ref text,           -- id or label
  scope_detail jsonb,       -- { role, oferta_id, programa_id, semestre, user_ids[]... }
  subject text,
  body_preview text,
  recipients_count int NOT NULL DEFAULT 0,
  threads_created int NOT NULL DEFAULT 0,
  threads_failed int NOT NULL DEFAULT 0,
  errors jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.msg_bulk_send_log TO authenticated;
GRANT ALL ON public.msg_bulk_send_log TO service_role;
ALTER TABLE public.msg_bulk_send_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own bulk log" ON public.msg_bulk_send_log;
CREATE POLICY "own bulk log" ON public.msg_bulk_send_log FOR SELECT TO authenticated
  USING (sender_user_id = auth.uid() OR public.sem_is_staff(auth.uid()));
DROP POLICY IF EXISTS "insert bulk log" ON public.msg_bulk_send_log;
CREATE POLICY "insert bulk log" ON public.msg_bulk_send_log FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid());

-- 2) Plantillas de mensajes
CREATE TABLE IF NOT EXISTS public.msg_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,                       -- 'bienvenida','calificacion','zoom','general'
  subject text NOT NULL,
  body text NOT NULL,
  variables text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_shared boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.msg_templates TO authenticated;
GRANT ALL ON public.msg_templates TO service_role;
ALTER TABLE public.msg_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view own or shared templates" ON public.msg_templates;
CREATE POLICY "view own or shared templates" ON public.msg_templates FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_shared = true OR public.sem_is_staff(auth.uid()));
DROP POLICY IF EXISTS "manage own templates" ON public.msg_templates;
CREATE POLICY "manage own templates" ON public.msg_templates FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.sem_is_staff(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.sem_is_staff(auth.uid()));

DROP TRIGGER IF EXISTS trg_msg_templates_updated_at ON public.msg_templates;
CREATE TRIGGER trg_msg_templates_updated_at BEFORE UPDATE ON public.msg_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Plantillas iniciales (compartidas)
INSERT INTO public.msg_templates (name, category, subject, body, variables, is_shared, created_by)
VALUES
  ('Bienvenida estudiante','bienvenida','Bienvenido al programa {programa}',
   'Hola {nombre},\n\nTe damos la bienvenida al programa {programa}. Tu primer semestre comienza el {fecha_inicio}.\n\nRevisa tu aula virtual para ver materias y horarios.',
   ARRAY['nombre','programa','fecha_inicio'], true, NULL),
  ('Aviso de calificación','calificacion','Nueva calificación en {curso}',
   'Hola {nombre},\n\nSe ha registrado tu nota final {nota} en la materia {curso} ({semestre}).\nEstado: {estado}.',
   ARRAY['nombre','curso','semestre','nota','estado'], true, NULL),
  ('Recordatorio Zoom','zoom','Recordatorio: clase Zoom de {curso}',
   'Hola {nombre},\n\nRecuerda tu clase de {curso} el {fecha} a las {hora}.\nEnlace: {enlace}',
   ARRAY['nombre','curso','fecha','hora','enlace'], true, NULL)
ON CONFLICT DO NOTHING;

-- 3) Mensajes programados
CREATE TABLE IF NOT EXISTS public.msg_scheduled (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending'|'sent'|'failed'|'cancelled'
  sender_user_id uuid,
  system_sender_key text NOT NULL DEFAULT 'notificaciones_cmg',
  scope_type text NOT NULL, -- 'oferta'|'programa'|'role'|'users'
  scope_ref text,           -- id/role
  semestre int,
  user_ids uuid[],
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  thread_id uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS msg_scheduled_status_for_idx ON public.msg_scheduled(status, scheduled_for);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.msg_scheduled TO authenticated;
GRANT ALL ON public.msg_scheduled TO service_role;
ALTER TABLE public.msg_scheduled ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view own scheduled" ON public.msg_scheduled;
CREATE POLICY "view own scheduled" ON public.msg_scheduled FOR SELECT TO authenticated
  USING (sender_user_id = auth.uid() OR public.sem_is_staff(auth.uid()));
DROP POLICY IF EXISTS "manage own scheduled" ON public.msg_scheduled;
CREATE POLICY "manage own scheduled" ON public.msg_scheduled FOR ALL TO authenticated
  USING (sender_user_id = auth.uid() OR public.sem_is_staff(auth.uid()))
  WITH CHECK (sender_user_id = auth.uid() OR public.sem_is_staff(auth.uid()));

DROP TRIGGER IF EXISTS trg_msg_scheduled_updated_at ON public.msg_scheduled;
CREATE TRIGGER trg_msg_scheduled_updated_at BEFORE UPDATE ON public.msg_scheduled
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Función para resolver destinatarios según scope
CREATE OR REPLACE FUNCTION public.msg_resolve_recipients(_scope_type text, _scope_ref text, _semestre int, _user_ids uuid[])
RETURNS uuid[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_ids uuid[];
BEGIN
  IF _scope_type = 'users' THEN
    v_ids := _user_ids;
  ELSIF _scope_type = 'role' THEN
    SELECT ARRAY_AGG(user_id) INTO v_ids FROM public.user_roles WHERE role = _scope_ref::app_role;
  ELSIF _scope_type = 'oferta' THEN
    SELECT ARRAY_AGG(DISTINCT i.user_id) INTO v_ids
      FROM public.sem_inscripcion_materias im
      JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
      WHERE im.oferta_id = _scope_ref::uuid AND i.user_id IS NOT NULL;
  ELSIF _scope_type = 'programa' THEN
    SELECT ARRAY_AGG(DISTINCT i.user_id) INTO v_ids
      FROM public.sem_inscripciones i
      WHERE i.programa_id = _scope_ref::uuid
        AND (_semestre IS NULL OR _semestre = 0 OR i.semestre_actual = _semestre)
        AND i.user_id IS NOT NULL;
  END IF;
  RETURN COALESCE(v_ids, ARRAY[]::uuid[]);
END; $$;

-- 5) Procesador de programados (ejecutado por cron)
CREATE OR REPLACE FUNCTION public.msg_process_scheduled()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r RECORD; v_ids uuid[]; v_thread uuid; v_subject text; v_body text; v_count int := 0; v_key text; v_val text;
BEGIN
  FOR r IN
    SELECT * FROM public.msg_scheduled
    WHERE status = 'pending' AND scheduled_for <= now()
    ORDER BY scheduled_for ASC LIMIT 50
  LOOP
    BEGIN
      v_ids := public.msg_resolve_recipients(r.scope_type, r.scope_ref, r.semestre, r.user_ids);
      v_subject := r.subject; v_body := r.body;
      -- Sustitución de variables globales
      FOR v_key, v_val IN SELECT key, value::text FROM jsonb_each_text(r.variables) LOOP
        v_subject := replace(v_subject, '{' || v_key || '}', COALESCE(v_val,''));
        v_body := replace(v_body, '{' || v_key || '}', COALESCE(v_val,''));
      END LOOP;

      IF array_length(v_ids, 1) IS NULL THEN
        UPDATE public.msg_scheduled
          SET status='failed', error='Sin destinatarios resueltos', sent_at=now()
          WHERE id = r.id;
      ELSE
        v_thread := public.msg_send_system(r.system_sender_key, v_ids, v_subject, v_body);
        UPDATE public.msg_scheduled
          SET status='sent', sent_at=now(), thread_id=v_thread
          WHERE id = r.id;

        INSERT INTO public.msg_bulk_send_log
          (sender_user_id, scope_type, scope_ref, scope_detail, subject, body_preview, recipients_count, threads_created)
        VALUES
          (r.sender_user_id, r.scope_type, r.scope_ref,
           jsonb_build_object('semestre', r.semestre, 'scheduled_id', r.id),
           v_subject, left(v_body, 200), COALESCE(array_length(v_ids,1),0), 1);
      END IF;
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.msg_scheduled SET status='failed', error=SQLERRM, sent_at=now() WHERE id = r.id;
    END;
  END LOOP;
  RETURN v_count;
END; $$;

-- 6) Cron job cada minuto
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA public;
DO $$ BEGIN
  PERFORM cron.unschedule('msg_process_scheduled_job');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('msg_process_scheduled_job', '* * * * *', $$SELECT public.msg_process_scheduled();$$);

GRANT EXECUTE ON FUNCTION public.msg_resolve_recipients(text, text, int, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.msg_process_scheduled() TO service_role;
