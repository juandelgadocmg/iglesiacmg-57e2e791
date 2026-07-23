CREATE OR REPLACE FUNCTION public.audit_profile_link_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.persona_id IS NOT DISTINCT FROM OLD.persona_id
     AND NEW.display_name IS NOT DISTINCT FROM OLD.display_name THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.security_audit_log (table_name, operation, row_id, actor_user_id, actor_email, changed, old_row, new_row)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.user_id::text, OLD.user_id::text),
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    jsonb_build_object(
      'persona_id', jsonb_build_object('antes', OLD.persona_id, 'despues', NEW.persona_id),
      'display_name', jsonb_build_object('antes', OLD.display_name, 'despues', NEW.display_name)
    ),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$;