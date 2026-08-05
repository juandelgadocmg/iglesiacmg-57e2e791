
-- Add update_token to leaders
ALTER TABLE public.leaders ADD COLUMN IF NOT EXISTS update_token text UNIQUE;

-- Drop ALL existing RLS policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Public SELECT on all relevant tables (anon can read)
CREATE POLICY "anon_select_leaders" ON public.leaders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_select_discipulos" ON public.discipulos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_select_etapas" ON public.etapas_discipulado FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_select_progreso" ON public.progreso_discipulo FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_select_seguimientos" ON public.seguimientos FOR SELECT TO anon, authenticated USING (true);
