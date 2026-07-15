
-- Profiles: restrict SELECT to owner or staff
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Profiles select own or staff"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'pastor'::public.app_role)
);

-- prog_asignaciones: restrict SELECT to staff/leaders or the assigned persona
DROP POLICY IF EXISTS "prog_asign read" ON public.prog_asignaciones;

CREATE POLICY "prog_asign read scoped"
ON public.prog_asignaciones
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  OR public.has_role(auth.uid(), 'lider_red'::public.app_role)
  OR public.has_role(auth.uid(), 'lider'::public.app_role)
  OR public.has_role(auth.uid(), 'lider_casa_paz'::public.app_role)
  OR persona_id = public.sem_persona_id_for_user(auth.uid())
  OR persona_id IN (SELECT persona_id FROM public.profiles WHERE user_id = auth.uid() AND persona_id IS NOT NULL)
);
