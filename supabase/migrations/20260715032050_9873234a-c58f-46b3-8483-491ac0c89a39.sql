
CREATE OR REPLACE FUNCTION public.log_storage_event(
  _bucket text,
  _path text,
  _operation text,
  _details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_op text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF _bucket IS NULL OR btrim(_bucket) = '' THEN
    RAISE EXCEPTION 'bucket required';
  END IF;
  v_op := upper(coalesce(_operation, ''));
  IF v_op NOT IN ('UPLOAD','UPDATE','DELETE','DOWNLOAD','SIGNED_URL') THEN
    RAISE EXCEPTION 'operation must be UPLOAD/UPDATE/DELETE/DOWNLOAD/SIGNED_URL';
  END IF;

  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  EXCEPTION WHEN OTHERS THEN v_email := NULL; END;

  INSERT INTO public.security_audit_log
    (table_name, operation, row_id, actor_user_id, actor_email, changed, old_row, new_row)
  VALUES (
    'storage:' || _bucket,
    v_op,
    _path,
    v_uid,
    v_email,
    coalesce(_details, '{}'::jsonb) || jsonb_build_object('bucket', _bucket, 'path', _path),
    NULL,
    NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_storage_event(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_storage_event(text, text, text, jsonb) TO authenticated;
