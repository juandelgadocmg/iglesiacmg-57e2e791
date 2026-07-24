
CREATE TABLE public.qr_audit_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_audit_presets TO authenticated;
GRANT ALL ON public.qr_audit_presets TO service_role;
ALTER TABLE public.qr_audit_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own qr audit presets"
  ON public.qr_audit_presets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_qr_audit_presets_updated
  BEFORE UPDATE ON public.qr_audit_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.qr_audit_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  servicio_id uuid NULL,
  code text NULL,
  window_days integer NOT NULL DEFAULT 7 CHECK (window_days BETWEEN 1 AND 90),
  min_events integer NOT NULL DEFAULT 10 CHECK (min_events > 0),
  fail_rate_pct numeric NOT NULL DEFAULT 20 CHECK (fail_rate_pct >= 0 AND fail_rate_pct <= 100),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_audit_alerts TO authenticated;
GRANT ALL ON public.qr_audit_alerts TO service_role;
ALTER TABLE public.qr_audit_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own qr audit alerts"
  ON public.qr_audit_alerts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_qr_audit_alerts_updated
  BEFORE UPDATE ON public.qr_audit_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
