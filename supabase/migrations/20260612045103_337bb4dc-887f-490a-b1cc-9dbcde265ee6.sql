
-- 1) Audit log del seminario
CREATE TABLE public.sem_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  persona_id uuid REFERENCES public.personas(id) ON DELETE SET NULL,
  inscripcion_id uuid REFERENCES public.sem_inscripciones(id) ON DELETE SET NULL,
  oferta_id uuid REFERENCES public.sem_ofertas(id) ON DELETE SET NULL,
  materia_id uuid REFERENCES public.sem_materias(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sem_audit_log_created_at_idx ON public.sem_audit_log (created_at DESC);
CREATE INDEX sem_audit_log_persona_idx ON public.sem_audit_log (persona_id);

GRANT SELECT, INSERT ON public.sem_audit_log TO authenticated;
GRANT ALL ON public.sem_audit_log TO service_role;
ALTER TABLE public.sem_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff seminario pueden ver el log"
  ON public.sem_audit_log FOR SELECT TO authenticated
  USING (public.sem_is_staff(auth.uid()));

CREATE POLICY "Autenticados pueden registrar su propia accion"
  ON public.sem_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- 2) Preferencias por usuario
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pref_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pref_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario administra sus preferencias"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER notification_preferences_set_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Preferencias por rol (defaults)
CREATE TABLE public.notification_role_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  pref_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, pref_key)
);
GRANT SELECT ON public.notification_role_preferences TO authenticated;
GRANT ALL ON public.notification_role_preferences TO service_role;
ALTER TABLE public.notification_role_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden leer preferencias de rol"
  ON public.notification_role_preferences FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solo admins gestionan preferencias de rol"
  ON public.notification_role_preferences FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE TRIGGER notification_role_prefs_set_updated
  BEFORE UPDATE ON public.notification_role_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
