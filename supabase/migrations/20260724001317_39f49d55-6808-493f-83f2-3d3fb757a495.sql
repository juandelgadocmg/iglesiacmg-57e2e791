
-- Retention: keep qr_scan_log for 90 days
CREATE OR REPLACE FUNCTION public.qr_scan_log_cleanup(_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  DELETE FROM public.qr_scan_log
  WHERE created_at < now() - make_interval(days => _days);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.qr_scan_log_cleanup(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qr_scan_log_cleanup(integer) TO service_role;

-- Status function readable by admins
CREATE OR REPLACE FUNCTION public.qr_scan_log_retention_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_oldest timestamptz;
  v_newest timestamptz;
  v_expired bigint;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'secretaria')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT count(*), min(created_at), max(created_at) INTO v_total, v_oldest, v_newest FROM public.qr_scan_log;
  SELECT count(*) INTO v_expired FROM public.qr_scan_log WHERE created_at < now() - interval '90 days';
  RETURN jsonb_build_object(
    'retention_days', 90,
    'total', v_total,
    'expired_pending_cleanup', v_expired,
    'oldest', v_oldest,
    'newest', v_newest
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.qr_scan_log_retention_status() TO authenticated;

-- Cron job: daily cleanup 03:15 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'qr_scan_log_cleanup_daily') THEN
    PERFORM cron.unschedule('qr_scan_log_cleanup_daily');
  END IF;
  PERFORM cron.schedule(
    'qr_scan_log_cleanup_daily',
    '15 3 * * *',
    $c$ SELECT public.qr_scan_log_cleanup(90); $c$
  );
END $$;
