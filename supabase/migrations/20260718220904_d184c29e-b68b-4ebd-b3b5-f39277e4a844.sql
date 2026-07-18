CREATE OR REPLACE FUNCTION public.can_create_personas(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_role_list AS (
    SELECT ur.role
    FROM public.user_roles ur
    WHERE ur.user_id = _uid
  )
  SELECT COALESCE(
    bool_or(
      CASE
        WHEN role IN ('admin'::public.app_role, 'super_admin'::public.app_role) THEN true
        WHEN EXISTS (
          SELECT 1
          FROM public.role_permissions rp
          WHERE rp.role = user_role_list.role
            AND rp.action_key = 'personas:create'
        ) THEN EXISTS (
          SELECT 1
          FROM public.role_permissions rp
          WHERE rp.role = user_role_list.role
            AND rp.action_key = 'personas:create'
            AND rp.allowed = true
        )
        ELSE role IN (
          'pastor'::public.app_role,
          'lider'::public.app_role,
          'secretaria'::public.app_role,
          'consolidador_lider'::public.app_role,
          'consolidador'::public.app_role
        )
      END
    ),
    false
  )
  FROM user_role_list;
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