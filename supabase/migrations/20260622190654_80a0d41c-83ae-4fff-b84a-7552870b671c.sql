
-- Permitir actualizar periodo/anio de ingreso (con auditoría) y registrar cambios en sem_audit_log

-- 1) Reemplazar trigger: solo asigna defaults en INSERT, ya no bloquea UPDATE
CREATE OR REPLACE FUNCTION public.sem_set_periodo_ingreso()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_periodo uuid;
  v_prev_anio integer;
  v_fecha integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT i.periodo_ingreso_id, i.anio_ingreso
      INTO v_prev_periodo, v_prev_anio
    FROM public.sem_inscripciones i
    JOIN public.sem_periodos p ON p.id = i.periodo_id
    WHERE i.persona_id = NEW.persona_id
      AND i.programa_id = NEW.programa_id
    ORDER BY p.fecha_inicio ASC NULLS LAST, i.created_at ASC
    LIMIT 1;

    IF v_prev_periodo IS NOT NULL THEN
      NEW.periodo_ingreso_id := COALESCE(NEW.periodo_ingreso_id, v_prev_periodo);
      NEW.anio_ingreso := COALESCE(NEW.anio_ingreso, v_prev_anio);
    ELSE
      NEW.periodo_ingreso_id := COALESCE(NEW.periodo_ingreso_id, NEW.periodo_id);
      SELECT EXTRACT(YEAR FROM fecha_inicio)::int INTO v_fecha
        FROM public.sem_periodos WHERE id = NEW.periodo_ingreso_id;
      NEW.anio_ingreso := COALESCE(NEW.anio_ingreso, v_fecha);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Trigger de auditoría para cambios en periodo / periodo_ingreso / anio_ingreso
CREATE OR REPLACE FUNCTION public.sem_audit_inscripcion_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_changed jsonb := '{}'::jsonb;
  v_uid uuid := auth.uid();
  v_email text;
BEGIN
  IF NEW.periodo_id IS DISTINCT FROM OLD.periodo_id THEN
    v_changed := v_changed || jsonb_build_object('periodo_id', jsonb_build_object('antes', OLD.periodo_id, 'despues', NEW.periodo_id));
  END IF;
  IF NEW.periodo_ingreso_id IS DISTINCT FROM OLD.periodo_ingreso_id THEN
    v_changed := v_changed || jsonb_build_object('periodo_ingreso_id', jsonb_build_object('antes', OLD.periodo_ingreso_id, 'despues', NEW.periodo_ingreso_id));
  END IF;
  IF NEW.anio_ingreso IS DISTINCT FROM OLD.anio_ingreso THEN
    v_changed := v_changed || jsonb_build_object('anio_ingreso', jsonb_build_object('antes', OLD.anio_ingreso, 'despues', NEW.anio_ingreso));
  END IF;

  IF v_changed = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.sem_audit_log (action, actor_user_id, actor_email, persona_id, inscripcion_id, details)
  VALUES (
    CASE
      WHEN (v_changed ? 'anio_ingreso') OR (v_changed ? 'periodo_ingreso_id') THEN 'inscripcion.anio_actualizado'
      ELSE 'inscripcion.periodo_actualizado'
    END,
    v_uid, v_email, NEW.persona_id, NEW.id, v_changed
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sem_audit_inscripcion_changes ON public.sem_inscripciones;
CREATE TRIGGER trg_sem_audit_inscripcion_changes
AFTER UPDATE ON public.sem_inscripciones
FOR EACH ROW EXECUTE FUNCTION public.sem_audit_inscripcion_changes();
