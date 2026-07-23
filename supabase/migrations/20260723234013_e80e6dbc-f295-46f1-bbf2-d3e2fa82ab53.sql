
-- 1) Campos QR en servicios
ALTER TABLE public.servicios
  ADD COLUMN IF NOT EXISTS qr_token uuid,
  ADD COLUMN IF NOT EXISTS qr_activo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS servicios_qr_token_key ON public.servicios(qr_token) WHERE qr_token IS NOT NULL;

-- 2) Campos extra en asistencia
ALTER TABLE public.asistencia
  ADD COLUMN IF NOT EXISTS checkin_time timestamptz,
  ADD COLUMN IF NOT EXISTS puntualidad text,
  ADD COLUMN IF NOT EXISTS metodo_registro text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS observaciones text;

CREATE UNIQUE INDEX IF NOT EXISTS asistencia_servicio_persona_key ON public.asistencia(servicio_id, persona_id);

GRANT SELECT, INSERT, UPDATE ON public.asistencia TO authenticated;

-- 3) Realtime
ALTER TABLE public.asistencia REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.asistencia';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 4) RPC de check-in por QR (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.checkin_qr(_servicio_id uuid, _token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated', 'message', 'Debes iniciar sesión.');
  END IF;

  SELECT * INTO v_svc FROM public.servicios WHERE id = _servicio_id;
  IF v_svc.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Reunión no encontrada.');
  END IF;

  IF v_svc.qr_token IS NULL OR v_svc.qr_token <> _token OR NOT v_svc.qr_activo
     OR (v_svc.qr_expires_at IS NOT NULL AND v_svc.qr_expires_at < v_now) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'qr_inactive', 'message', 'El QR no está activo o expiró.');
  END IF;

  -- Persona vinculada
  SELECT p.persona_id INTO v_persona_id FROM public.profiles p WHERE p.user_id = v_uid;
  IF v_persona_id IS NULL THEN
    -- intentar por email
    SELECT per.id INTO v_persona_id
    FROM auth.users u JOIN public.personas per ON lower(trim(per.email)) = lower(trim(u.email))
    WHERE u.id = v_uid LIMIT 1;
  END IF;
  IF v_persona_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'no_persona', 'message', 'Tu usuario no está vinculado a una persona. Contacta al administrador.');
  END IF;

  SELECT id, nombres, apellidos INTO v_persona FROM public.personas WHERE id = v_persona_id;

  -- Ya registrado?
  SELECT * INTO v_existing FROM public.asistencia WHERE servicio_id = _servicio_id AND persona_id = v_persona_id;
  IF v_existing.id IS NOT NULL AND v_existing.presente THEN
    RETURN jsonb_build_object(
      'ok', true, 'code', 'already', 'message', 'Ya registraste tu asistencia.',
      'nombre', trim(coalesce(v_persona.nombres,'') || ' ' || coalesce(v_persona.apellidos,'')),
      'checkin_time', v_existing.checkin_time, 'puntualidad', v_existing.puntualidad
    );
  END IF;

  -- Calcular puntualidad (hora de la reunión en zona Bogotá)
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

  RETURN jsonb_build_object(
    'ok', true, 'code', 'ok', 'message', '¡Asistencia registrada!',
    'nombre', trim(coalesce(v_persona.nombres,'') || ' ' || coalesce(v_persona.apellidos,'')),
    'checkin_time', v_now, 'puntualidad', v_punt
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkin_qr(uuid, uuid) TO authenticated;

-- 5) RPC para activar / cerrar QR (solo staff con manage servicios)
CREATE OR REPLACE FUNCTION public.servicio_qr_activate(_servicio_id uuid, _minutes integer DEFAULT 180)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_token uuid; v_exp timestamptz;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)
       OR has_role(auth.uid(),'pastor'::app_role) OR has_role(auth.uid(),'lider'::app_role)
       OR has_role(auth.uid(),'secretaria'::app_role)) THEN
    RAISE EXCEPTION 'No tienes permiso para activar el QR' USING ERRCODE = '42501';
  END IF;
  v_token := gen_random_uuid();
  v_exp := now() + make_interval(mins => GREATEST(_minutes, 5));
  UPDATE public.servicios SET qr_token = v_token, qr_activo = true, qr_activated_at = now(), qr_expires_at = v_exp
    WHERE id = _servicio_id;
  RETURN jsonb_build_object('ok', true, 'token', v_token, 'expires_at', v_exp);
END;
$$;
GRANT EXECUTE ON FUNCTION public.servicio_qr_activate(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.servicio_qr_close(_servicio_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)
       OR has_role(auth.uid(),'pastor'::app_role) OR has_role(auth.uid(),'lider'::app_role)
       OR has_role(auth.uid(),'secretaria'::app_role)) THEN
    RAISE EXCEPTION 'No tienes permiso' USING ERRCODE = '42501';
  END IF;
  UPDATE public.servicios SET qr_activo = false, qr_expires_at = now() WHERE id = _servicio_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.servicio_qr_close(uuid) TO authenticated;
