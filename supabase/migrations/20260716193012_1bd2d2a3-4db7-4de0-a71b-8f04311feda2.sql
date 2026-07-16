
CREATE TABLE public.export_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  format text NOT NULL CHECK (format IN ('pdf','excel','csv')),
  filename text NOT NULL,
  title text,
  row_count integer NOT NULL DEFAULT 0,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.export_audit_log TO authenticated;
GRANT ALL ON public.export_audit_log TO service_role;

ALTER TABLE public.export_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "export_audit self insert"
  ON public.export_audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "export_audit admins read"
  ON public.export_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX export_audit_log_created_at_idx ON public.export_audit_log (created_at DESC);
CREATE INDEX export_audit_log_user_idx ON public.export_audit_log (user_id, created_at DESC);
