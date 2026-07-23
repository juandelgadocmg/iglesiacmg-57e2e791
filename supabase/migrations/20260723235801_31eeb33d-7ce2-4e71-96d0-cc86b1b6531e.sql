
CREATE TABLE IF NOT EXISTS public.qr_scan_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  persona_id uuid,
  servicio_id uuid,
  token uuid,
  result text NOT NULL,
  code text,
  message text,
  user_agent text,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.qr_scan_log TO authenticated;
GRANT ALL ON public.qr_scan_log TO service_role;

ALTER TABLE public.qr_scan_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_scan_log admin read"
  ON public.qr_scan_log FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'secretaria')
  );

CREATE POLICY "qr_scan_log self read"
  ON public.qr_scan_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "qr_scan_log no direct insert"
  ON public.qr_scan_log FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_qr_scan_log_servicio ON public.qr_scan_log(servicio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_scan_log_user ON public.qr_scan_log(user_id, created_at DESC);

ALTER TABLE public.qr_scan_log REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_scan_log';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;

CREATE OR REPLACE FUNCTION public.checkin_qr(_servicio_id uuid, _token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_persona_id uuid;
  v_persona record;
  v_svc record;
  v_now timestamptz := now();
  v_bogota timestamp;
  v_svc_ts timestamp;
  v_diff_min numeric;
  v_punt text;
  v_existing record;
  v_recent_count int;
  v_resp jsonb;
BEGIN
  IF v_uid IS NULL THEN
    INSERT INTO public.qr_scan_log(user_id, servicio_id, token, result, code, message)
      VALUES (NULL, _servicio_id, _token, 'error', 'unauthenticated', 'No session');
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated', 'message', 'Debes iniciar sesión.');
  END IF;

  SELECT count(*) INTO v_recent_count
  FROM public.qr_scan_log
  WHERE user_id = v_uid
    AND servicio_id = _servicio_id
    AND token = _token
    AND created_at > v_now - interval '30 seconds'
    AND result IN ('ok','already');
  IF v_recent_count > 0 THEN
    INSERT INTO public.qr_scan_log(user_id, servicio_id, token, result, code, message)
      VALUES (v_uid, _servicio_id, _token, 'throttled', 'throttled', 'Duplicate within 30s');
    RETURN jsonb_build_object('ok', true, 'code', 'throttled',
      'message', 'Ya registramos tu escaneo hace segundos, espera un momento.');
  END IF;

  SELECT * INTO v_svc FROM public.servicios WHERE id = _servicio_id;
  IF v_svc.id IS NULL THEN
    INSERT INTO public.qr_scan_log(user_id, servicio_id, token, result, code, message)
      VALUES (v_uid, _servicio_id, _token, 'error', 'not_found', 'Servicio inexistente');
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Reunión no encontrada.');
  END IF;

  IF v_svc.qr_token IS NULL OR v_svc.qr_token <> _token OR NOT v_svc.qr_activo
     OR (v_svc.qr_expires_at IS NOT NULL AND v_svc.qr_expires_at < v_now) THEN
    INSERT INTO public.qr_scan_log(user_id, servicio_id, token, result, code, message)
      VALUES (v_uid, _servicio_id, _token, 'error', 'qr_inactive', 'Token invalido o expirado');
    RETURN jsonb_build_object('ok', false, 'code', 'qr_inactive', 'message', 'El QR no está activo o expiró.');
  END IF;

  SELECT p.persona_id INTO v_persona_id FROM public.profiles p WHERE p.user_id = v_uid;
  IF v_persona_id IS NULL THEN
    SELECT per.id INTO v_persona_id
    FROM auth.users u JOIN public.personas per ON lower(trim(per.email)) = lower(trim(u.email))
    WHERE u.id = v_uid LIMIT 1;
  END IF;
  IF v_persona_id IS NULL THEN
    INSERT INTO public.qr_scan_log(user_id, servicio_id, token, result, code, message)
      VALUES (v_uid, _servicio_id, _token, 'error', 'no_persona', 'Usuario sin persona');
    RETURN jsonb_build_object('ok', false, 'code', 'no_persona', 'message', 'Tu usuario no está vinculado a una persona. Contacta al administrador.');
  END IF;

  SELECT id, nombres, apellidos INTO v_persona FROM public.personas WHERE id = v_persona_id;

  SELECT * INTO v_existing FROM public.asistencia WHERE servicio_id = _servicio_id AND persona_id = v_persona_id;
  IF v_existing.id IS NOT NULL AND v_existing.presente THEN
    INSERT INTO public.qr_scan_log(user_id, persona_id, servicio_id, token, result, code, message)
      VALUES (v_uid, v_persona_id, _servicio_id, _token, 'already', 'already', 'Asistencia previa');
    RETURN jsonb_build_object(
      'ok', true, 'code', 'already', 'message', 'Ya registraste tu asistencia.',
      'nombre', trim(coalesce(v_persona.nombres,'') || ' ' || coalesce(v_persona.apellidos,'')),
      'servicio', v_svc.nombre,
      'checkin_time', v_existing.checkin_time, 'puntualidad', v_existing.puntualidad
    );
  END IF;

  v_bogota := (v_now AT TIME ZONE 'America/Bogota');
  v_svc_ts := (v_svc.fecha::text || ' ' || COALESCE(NULLIF(regexp_replace(coalesce(v_svc.hora,''), '[^0-9:]', '', 'g'), ''), '09:00'))::timestamp;
  v_diff_min := EXTRACT(EPOCH FROM (v_bogota - v_svc_ts)) / 60.0;

  v_punt := CASE
    WHEN v_diff_min < 0 THEN 'Excelente'
    WHEN v_diff_min <= 5 THEN 'Puntual'
    WHEN v_diff_min <= 10 THEN 'Tarde leve'
    WHEN v_diff_min <= 20 THEN 'Tarde'
    ELSE 'Muy tarde'
  END;

  INSERT INTO public.asistencia (servicio_id, persona_id, presente, checkin_time, puntualidad, metodo_registro)
  VALUES (_servicio_id, v_persona_id, true, v_now, v_punt, 'qr')
  ON CONFLICT (servicio_id, persona_id) DO UPDATE
    SET presente = true,
        checkin_time = COALESCE(public.asistencia.checkin_time, EXCLUDED.checkin_time),
        puntualidad = COALESCE(public.asistencia.puntualidad, EXCLUDED.puntualidad),
        metodo_registro = CASE WHEN public.asistencia.metodo_registro = 'manual' THEN 'qr' ELSE public.asistencia.metodo_registro END;

  INSERT INTO public.qr_scan_log(user_id, persona_id, servicio_id, token, result, code, message)
    VALUES (v_uid, v_persona_id, _servicio_id, _token, 'ok', 'ok', 'Asistencia registrada');

  RETURN jsonb_build_object(
    'ok', true, 'code', 'ok', 'message', '¡Asistencia registrada!',
    'nombre', trim(coalesce(v_persona.nombres,'') || ' ' || coalesce(v_persona.apellidos,'')),
    'servicio', v_svc.nombre,
    'checkin_time', v_now, 'puntualidad', v_punt
  );
END;
$function$;
