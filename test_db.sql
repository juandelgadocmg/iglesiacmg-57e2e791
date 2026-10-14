CREATE OR REPLACE FUNCTION public.get_cron_errors()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  res json;
BEGIN
  SELECT json_agg(t) INTO res FROM (
    SELECT * FROM cron.job_run_details WHERE status = 'failed' ORDER BY start_time DESC LIMIT 5
  ) t;
  RETURN res;
END;
$$;
