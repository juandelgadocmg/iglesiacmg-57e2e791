
-- ============================================================
-- Tabla de auditoría de seguridad
-- ============================================================
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  row_id text,
  actor_user_id uuid,
  actor_email text,
  changed jsonb NOT NULL DEFAULT '{}'::jsonb,
  old_row jsonb,
  new_row jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_audit_log_table_created_idx
  ON public.security_audit_log (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_log_actor_idx
  ON public.security_audit_log (actor_user_id, created_at DESC);

GRANT SELECT ON public.security_audit_log TO authenticated;
GRANT ALL ON public.security_audit_log TO service_role;

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can read security audit" ON public.security_audit_log;
CREATE POLICY "Only admins can read security audit"
  ON public.security_audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- No INSERT/UPDATE/DELETE policies -> writes only via SECURITY DEFINER trigger below.

-- ============================================================
-- Trigger genérico de auditoría
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_sensitive_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_row_id text;
  v_changed jsonb := '{}'::jsonb;
  v_old jsonb;
  v_new jsonb;
  v_key text;
  v_ignore text[] := ARRAY['updated_at','created_at'];
BEGIN
  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_row_id := COALESCE((v_old->>'id'), (v_old->>'user_id'));
    v_changed := v_old;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_old := NULL;
    v_row_id := COALESCE((v_new->>'id'), (v_new->>'user_id'));
    v_changed := v_new;
  ELSE -- UPDATE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_row_id := COALESCE((v_new->>'id'), (v_new->>'user_id'));
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_key = ANY(v_ignore) THEN CONTINUE; END IF;
      IF (v_new -> v_key) IS DISTINCT FROM (v_old -> v_key) THEN
        v_changed := v_changed || jsonb_build_object(
          v_key,
          jsonb_build_object('antes', v_old -> v_key, 'despues', v_new -> v_key)
        );
      END IF;
    END LOOP;
    -- No-op update: skip logging
    IF v_changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.security_audit_log
    (table_name, operation, row_id, actor_user_id, actor_email, changed, old_row, new_row)
  VALUES
    (TG_TABLE_NAME, TG_OP, v_row_id, v_uid, v_email, v_changed, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- Trigger para cambios de persona vinculada en profiles
-- (solo dispara si cambia persona_id o display_name)
-- ============================================================
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
  PERFORM public.audit_sensitive_change();
  -- Re-implement inline to reuse pattern with correct OLD/NEW binding
  INSERT INTO public.security_audit_log (table_name, operation, row_id, actor_user_id, actor_email, changed, old_row, new_row)
  VALUES (
    TG_TABLE_NAME, TG_OP,
    COALESCE(NEW.user_id::text, OLD.user_id::text),
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    jsonb_build_object(
      'persona_id', jsonb_build_object('antes', OLD.persona_id, 'despues', NEW.persona_id),
      'display_name', jsonb_build_object('antes', OLD.display_name, 'despues', NEW.display_name)
    ),
    to_jsonb(OLD), to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

-- Only staff execute (triggers run as owner regardless, but restrict direct exec)
REVOKE EXECUTE ON FUNCTION public.audit_sensitive_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_profile_link_change() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- Enlazar triggers a las tablas sensibles
-- ============================================================
DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();

DROP TRIGGER IF EXISTS trg_audit_profiles_link ON public.profiles;
CREATE TRIGGER trg_audit_profiles_link
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.persona_id IS DISTINCT FROM NEW.persona_id
        OR OLD.display_name IS DISTINCT FROM NEW.display_name)
  EXECUTE FUNCTION public.audit_profile_link_change();

DROP TRIGGER IF EXISTS trg_audit_finanzas ON public.finanzas;
CREATE TRIGGER trg_audit_finanzas
  AFTER INSERT OR UPDATE OR DELETE ON public.finanzas
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();

DROP TRIGGER IF EXISTS trg_audit_configuracion ON public.configuracion_iglesia;
CREATE TRIGGER trg_audit_configuracion
  AFTER UPDATE OR DELETE ON public.configuracion_iglesia
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();

DROP TRIGGER IF EXISTS trg_audit_sem_calificaciones ON public.sem_calificaciones;
CREATE TRIGGER trg_audit_sem_calificaciones
  AFTER INSERT OR UPDATE OR DELETE ON public.sem_calificaciones
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();
