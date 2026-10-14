
-- 1. leaders: revoke sensitive columns from anon/authenticated, keep safe columns readable
REVOKE SELECT ON public.leaders FROM anon;
REVOKE SELECT ON public.leaders FROM authenticated;
GRANT SELECT (id, full_name, casa_de_paz_id, created_at, updated_at) ON public.leaders TO anon;
GRANT SELECT (id, full_name, casa_de_paz_id, created_at, updated_at, email) ON public.leaders TO authenticated;

-- 2. seguimientos: hide peticiones_oracion from anon
REVOKE SELECT ON public.seguimientos FROM anon;
GRANT SELECT (id, discipulo_id, fecha, resumen, asistencia, proximos_pasos, created_at, created_by) ON public.seguimientos TO anon;

-- 3. metas_mensuales: explicit deny SELECT to anon (no policy => already denied, but silence linter)
ALTER TABLE public.metas_mensuales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_all_metas" ON public.metas_mensuales;
CREATE POLICY "deny_all_metas" ON public.metas_mensuales FOR SELECT USING (false);

-- 4. Revoke EXECUTE on trigger-only SECURITY DEFINER functions from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_discipulo_last_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_discipulo_last_update_progreso() FROM PUBLIC, anon, authenticated;
-- has_role must remain callable inside RLS as authenticated
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
