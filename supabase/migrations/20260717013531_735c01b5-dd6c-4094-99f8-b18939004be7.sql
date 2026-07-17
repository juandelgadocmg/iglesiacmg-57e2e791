
REVOKE ALL ON FUNCTION public.audit_grupo_action() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_grupo_action() TO service_role;
