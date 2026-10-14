-- Fix cdp_generate_deadline_alerts cron job execution
DO $$ BEGIN
  PERFORM cron.unschedule('cdp-deadline-alerts-hourly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'cdp-deadline-alerts-hourly',
  '0 * * * *',
  $$SELECT public.cdp_generate_deadline_alerts();$$
);

UPDATE cron.job SET database = current_database() WHERE jobname = 'cdp-deadline-alerts-hourly';
