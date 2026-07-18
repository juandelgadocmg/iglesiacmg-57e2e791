CREATE OR REPLACE FUNCTION public.can_create_personas(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.has_role(_uid, 'admin'::public.app_role)
    OR public.has_role(_uid, 'super_admin'::public.app_role)
    OR public.has_role(_uid, 'pastor'::public.app_role)
    OR public.has_role(_uid, 'lider'::public.app_role)
    OR public.has_role(_uid, 'secretaria'::public.app_role)
    OR public.has_role(_uid, 'consolidador_lider'::public.app_role)
    OR public.has_role(_uid, 'consolidador'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp
        ON rp.role = ur.role
       AND rp.action_key = 'personas:create'
       AND rp.allowed = true
      WHERE ur.user_id = _uid
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.can_create_personas(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_create_personas(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_create_personas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_personas(uuid) TO service_role;

DROP POLICY IF EXISTS "Only personas:create roles can insert personas" ON public.personas;

CREATE POLICY "Only personas:create roles can insert personas"
ON public.personas
FOR INSERT
TO authenticated
WITH CHECK (public.can_create_personas(auth.uid()));