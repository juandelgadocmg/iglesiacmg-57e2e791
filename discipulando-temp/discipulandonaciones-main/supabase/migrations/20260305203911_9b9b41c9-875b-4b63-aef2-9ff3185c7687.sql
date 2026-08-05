
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "anon_select_casas" ON public.casas_de_paz;
DROP POLICY IF EXISTS "anon_select_discipulos" ON public.discipulos;
DROP POLICY IF EXISTS "anon_select_etapas" ON public.etapas_discipulado;
DROP POLICY IF EXISTS "anon_select_leaders" ON public.leaders;
DROP POLICY IF EXISTS "anon_select_progreso" ON public.progreso_discipulo;
DROP POLICY IF EXISTS "anon_select_redes" ON public.redes;
DROP POLICY IF EXISTS "anon_select_seguimientos" ON public.seguimientos;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "anon_select_casas" ON public.casas_de_paz FOR SELECT USING (true);
CREATE POLICY "anon_select_discipulos" ON public.discipulos FOR SELECT USING (true);
CREATE POLICY "anon_select_etapas" ON public.etapas_discipulado FOR SELECT USING (true);
CREATE POLICY "anon_select_leaders" ON public.leaders FOR SELECT USING (true);
CREATE POLICY "anon_select_progreso" ON public.progreso_discipulo FOR SELECT USING (true);
CREATE POLICY "anon_select_redes" ON public.redes FOR SELECT USING (true);
CREATE POLICY "anon_select_seguimientos" ON public.seguimientos FOR SELECT USING (true);
