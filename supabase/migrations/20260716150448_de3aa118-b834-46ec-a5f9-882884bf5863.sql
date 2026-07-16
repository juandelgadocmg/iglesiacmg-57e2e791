CREATE OR REPLACE FUNCTION public.log_persona_action(_persona_id uuid, _action text, _details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_op text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF _persona_id IS NULL THEN
    RAISE EXCEPTION 'persona_id required';
  END IF;
  v_op := upper(coalesce(_action, ''));
  IF v_op NOT IN ('CHECKIN','ATTENDANCE_MARK','EXPORT_FICHA','EXPORT_HISTORIAL','CERTIFICATE_ISSUED','PROFILE_QUICK_ACTION') THEN
    RAISE EXCEPTION 'action must be one of CHECKIN/ATTENDANCE_MARK/EXPORT_FICHA/EXPORT_HISTORIAL/CERTIFICATE_ISSUED/PROFILE_QUICK_ACTION';
  END IF;

  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  EXCEPTION WHEN OTHERS THEN v_email := NULL; END;

  INSERT INTO public.security_audit_log
    (table_name, operation, row_id, actor_user_id, actor_email, changed, old_row, new_row)
  VALUES (
    'personas',
    v_op,
    _persona_id::text,
    v_uid,
    v_email,
    coalesce(_details, '{}'::jsonb) || jsonb_build_object('persona_id', _persona_id),
    NULL,
    NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_persona_action(uuid, text, jsonb) TO authenticated;