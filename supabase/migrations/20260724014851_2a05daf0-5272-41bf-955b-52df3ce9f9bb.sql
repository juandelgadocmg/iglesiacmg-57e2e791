CREATE TABLE public.qr_audit_alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.qr_audit_alerts(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  servicio_id UUID,
  code TEXT,
  window_days INTEGER NOT NULL,
  min_events INTEGER NOT NULL,
  fail_rate_pct NUMERIC NOT NULL,
  total INTEGER NOT NULL,
  fails INTEGER NOT NULL,
  rate NUMERIC NOT NULL,
  sample_scan_ids UUID[] DEFAULT '{}',
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.qr_audit_alert_history TO authenticated;
GRANT ALL ON public.qr_audit_alert_history TO service_role;

ALTER TABLE public.qr_audit_alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_history_select" ON public.qr_audit_alert_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own_history_insert" ON public.qr_audit_alert_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_history_delete" ON public.qr_audit_alert_history
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_qr_alert_history_user_time ON public.qr_audit_alert_history(user_id, triggered_at DESC);
CREATE INDEX idx_qr_alert_history_alert ON public.qr_audit_alert_history(alert_id);