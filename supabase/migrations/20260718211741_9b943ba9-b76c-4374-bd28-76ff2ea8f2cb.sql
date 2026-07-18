REVOKE ALL ON FUNCTION public.can_create_personas(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_create_personas(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_create_personas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_personas(uuid) TO service_role;