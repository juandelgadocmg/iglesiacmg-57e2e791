REVOKE ALL ON FUNCTION public.sem_get_mi_persona() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_get_mi_persona() FROM anon;
GRANT EXECUTE ON FUNCTION public.sem_get_mi_persona() TO authenticated;

REVOKE ALL ON FUNCTION public.sem_resolve_user_id_from_persona(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_resolve_user_id_from_persona(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.sem_resolve_user_id_from_persona(uuid) TO authenticated, service_role;