
-- 1) Permitir mensajes del sistema (sender_id null cuando is_system)
ALTER TABLE public.msg_messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.msg_messages ADD COLUMN IF NOT EXISTS system_sender_key text;
ALTER TABLE public.msg_messages
  DROP CONSTRAINT IF EXISTS msg_messages_sender_or_system_chk;
ALTER TABLE public.msg_messages
  ADD CONSTRAINT msg_messages_sender_or_system_chk
  CHECK ((is_system = true AND system_sender_key IS NOT NULL) OR (is_system = false AND sender_id IS NOT NULL));

-- 2) Catálogo de remitentes virtuales
CREATE TABLE IF NOT EXISTS public.msg_system_senders (
  key text PRIMARY KEY,
  display_name text NOT NULL,
  avatar_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.msg_system_senders TO authenticated, anon;
GRANT ALL ON public.msg_system_senders TO service_role;
ALTER TABLE public.msg_system_senders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sys senders readable" ON public.msg_system_senders;
CREATE POLICY "sys senders readable" ON public.msg_system_senders FOR SELECT USING (true);

INSERT INTO public.msg_system_senders (key, display_name, description) VALUES
  ('sistema_academico','Sistema Académico','Notificaciones académicas automáticas'),
  ('notificaciones_cmg','Notificaciones CMG','Avisos generales de la plataforma'),
  ('secretaria_academica','Secretaría Académica','Comunicaciones de secretaría'),
  ('tesoreria','Tesorería','Pagos y vencimientos'),
  ('coordinacion_academica','Coordinación Académica','Coordinación de programas')
ON CONFLICT (key) DO NOTHING;

-- 3) Ajustar trigger after_message_insert para manejar sender_id null (sistema)
CREATE OR REPLACE FUNCTION public.msg_after_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.msg_threads SET last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.thread_id;
  IF NEW.sender_id IS NOT NULL THEN
    UPDATE public.msg_participants
       SET is_read = false, is_archived = false, is_deleted = false
     WHERE thread_id = NEW.thread_id AND user_id <> NEW.sender_id;
    UPDATE public.msg_participants
       SET is_read = true, last_read_at = now()
     WHERE thread_id = NEW.thread_id AND user_id = NEW.sender_id;
  ELSE
    UPDATE public.msg_participants
       SET is_read = false, is_archived = false, is_deleted = false
     WHERE thread_id = NEW.thread_id;
  END IF;
  RETURN NEW;
END; $$;

-- 4) Helper para enviar mensaje del sistema a múltiples user_ids
CREATE OR REPLACE FUNCTION public.msg_send_system(
  _sender_key text,
  _user_ids uuid[],
  _subject text,
  _body text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_thread uuid;
  v_msg uuid;
  v_uid uuid;
  v_recipients uuid[];
BEGIN
  v_recipients := ARRAY(SELECT DISTINCT u FROM unnest(_user_ids) u WHERE u IS NOT NULL);
  IF array_length(v_recipients, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  -- Crear thread (created_by usa el primer recipient solo para satisfacer NOT NULL)
  INSERT INTO public.msg_threads (subject, created_by)
  VALUES (COALESCE(_subject,'(sin asunto)'), v_recipients[1])
  RETURNING id INTO v_thread;

  -- Participantes (todos como "to")
  FOREACH v_uid IN ARRAY v_recipients LOOP
    INSERT INTO public.msg_participants (thread_id, user_id, role) VALUES (v_thread, v_uid, 'to')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Mensaje del sistema (sender_id null)
  INSERT INTO public.msg_messages (thread_id, sender_id, body, is_system, system_sender_key)
  VALUES (v_thread, NULL, COALESCE(_body,''), true, _sender_key)
  RETURNING id INTO v_msg;

  RETURN v_thread;
END; $$;

-- 5) Trigger: bienvenida al crear inscripción
CREATE OR REPLACE FUNCTION public.sem_msg_welcome_inscripcion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_prog text; BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT nombre INTO v_prog FROM public.sem_programas WHERE id = NEW.programa_id;
  PERFORM public.msg_send_system(
    'sistema_academico',
    ARRAY[NEW.user_id],
    'Bienvenido al programa ' || COALESCE(v_prog,''),
    'Tu inscripción ha sido registrada correctamente. ¡Te damos la bienvenida! Revisa tu aula virtual para ver materias, horarios y recursos.'
  );
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_msg_welcome_inscripcion ON public.sem_inscripciones;
CREATE TRIGGER trg_msg_welcome_inscripcion
  AFTER INSERT ON public.sem_inscripciones
  FOR EACH ROW EXECUTE FUNCTION public.sem_msg_welcome_inscripcion();

-- 6) Trigger: notificación al publicar calificación (cuando nota_final pasa de null a valor)
CREATE OR REPLACE FUNCTION public.sem_msg_calificacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid; v_mat text; BEGIN
  IF NEW.nota_final IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.nota_final IS NOT DISTINCT FROM NEW.nota_final THEN RETURN NEW; END IF;
  SELECT i.user_id, m.nombre INTO v_uid, v_mat
    FROM public.sem_inscripciones i
    LEFT JOIN public.sem_materias m ON m.id = NEW.materia_id
    WHERE i.id = NEW.inscripcion_id;
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  PERFORM public.msg_send_system(
    'sistema_academico',
    ARRAY[v_uid],
    'Nueva calificación: ' || COALESCE(v_mat,'Materia'),
    'Se ha registrado tu nota final ' || NEW.nota_final::text || ' en la materia ' || COALESCE(v_mat,'') || ' (Estado: ' || COALESCE(NEW.estado,'') || ').'
  );
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_msg_calificacion ON public.sem_inscripcion_materias;
CREATE TRIGGER trg_msg_calificacion
  AFTER INSERT OR UPDATE OF nota_final ON public.sem_inscripcion_materias
  FOR EACH ROW EXECUTE FUNCTION public.sem_msg_calificacion();

-- 7) Trigger: nueva evaluación/tarea para una oferta → notifica inscritos
CREATE OR REPLACE FUNCTION public.sem_msg_nueva_evaluacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uids uuid[]; v_mat text; BEGIN
  SELECT ARRAY_AGG(DISTINCT i.user_id) INTO v_uids
    FROM public.sem_inscripcion_materias im
    JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
    WHERE im.oferta_id = NEW.oferta_id AND i.user_id IS NOT NULL;
  SELECT m.nombre INTO v_mat
    FROM public.sem_ofertas o
    JOIN public.sem_materias m ON m.id = o.materia_id
    WHERE o.id = NEW.oferta_id;
  PERFORM public.msg_send_system(
    'coordinacion_academica',
    v_uids,
    'Nueva ' || COALESCE(NEW.tipo,'tarea') || ': ' || COALESCE(NEW.nombre,''),
    'Se ha publicado "' || COALESCE(NEW.nombre,'') || '" en ' || COALESCE(v_mat,'la materia') ||
    CASE WHEN NEW.fecha IS NOT NULL THEN '. Fecha: ' || NEW.fecha::text ELSE '' END ||
    COALESCE(E'\n\n' || NEW.descripcion, '')
  );
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_msg_nueva_evaluacion ON public.sem_evaluaciones;
CREATE TRIGGER trg_msg_nueva_evaluacion
  AFTER INSERT ON public.sem_evaluaciones
  FOR EACH ROW EXECUTE FUNCTION public.sem_msg_nueva_evaluacion();

-- 8) Trigger: nueva sesión Zoom → recordatorio a inscritos
CREATE OR REPLACE FUNCTION public.sem_msg_zoom_sesion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uids uuid[]; v_mat text; BEGIN
  SELECT ARRAY_AGG(DISTINCT i.user_id) INTO v_uids
    FROM public.sem_inscripcion_materias im
    JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
    WHERE im.oferta_id = NEW.oferta_id AND i.user_id IS NOT NULL;
  SELECT m.nombre INTO v_mat
    FROM public.sem_ofertas o
    JOIN public.sem_materias m ON m.id = o.materia_id
    WHERE o.id = NEW.oferta_id;
  PERFORM public.msg_send_system(
    'notificaciones_cmg',
    v_uids,
    'Clase Zoom programada: ' || COALESCE(v_mat,''),
    'Se ha agendado una clase Zoom "' || COALESCE(NEW.topic,'') || '" para el ' || COALESCE(NEW.start_time::text,'') ||
    E'.\nEnlace: ' || COALESCE(NEW.join_url,'(pendiente)')
  );
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_msg_zoom_sesion ON public.sem_zoom_sesiones;
CREATE TRIGGER trg_msg_zoom_sesion
  AFTER INSERT ON public.sem_zoom_sesiones
  FOR EACH ROW EXECUTE FUNCTION public.sem_msg_zoom_sesion();

-- 9) Helper: obtener user_ids por oferta / pensum-semestre / programa / rol
CREATE OR REPLACE FUNCTION public.msg_recipients_by_oferta(_oferta_id uuid)
RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT DISTINCT i.user_id FROM public.sem_inscripcion_materias im
  JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
  WHERE im.oferta_id = _oferta_id AND i.user_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.msg_recipients_by_programa(_programa_id uuid, _semestre int DEFAULT NULL)
RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT DISTINCT i.user_id FROM public.sem_inscripciones i
  WHERE i.programa_id = _programa_id
    AND (_semestre IS NULL OR i.semestre_actual = _semestre)
    AND i.user_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.msg_recipients_by_role(_role app_role)
RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT DISTINCT user_id FROM public.user_roles WHERE role = _role;
$$;

GRANT EXECUTE ON FUNCTION public.msg_send_system(text, uuid[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.msg_recipients_by_oferta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.msg_recipients_by_programa(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.msg_recipients_by_role(app_role) TO authenticated;
