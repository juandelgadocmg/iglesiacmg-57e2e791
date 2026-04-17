-- Add lider_casa_paz to personas SELECT policy so leaders can see their group members when reporting
DROP POLICY IF EXISTS "Role-scoped read personas" ON public.personas;

CREATE POLICY "Role-scoped read personas"
ON public.personas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'secretaria'::app_role)
  OR has_role(auth.uid(), 'consolidador_lider'::app_role)
  OR has_role(auth.uid(), 'consolidador'::app_role)
  OR has_role(auth.uid(), 'lider_red'::app_role)
  OR has_role(auth.uid(), 'maestro'::app_role)
  OR has_role(auth.uid(), 'lider_casa_paz'::app_role)
);

-- Also allow lider_casa_paz to insert/update personas (needed when adding new persons during the report)
DROP POLICY IF EXISTS "Role-scoped insert personas" ON public.personas;

CREATE POLICY "Role-scoped insert personas"
ON public.personas
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'secretaria'::app_role)
  OR has_role(auth.uid(), 'consolidador_lider'::app_role)
  OR has_role(auth.uid(), 'lider_casa_paz'::app_role)
  OR has_role(auth.uid(), 'lider_red'::app_role)
);

DROP POLICY IF EXISTS "Role-scoped update personas" ON public.personas;

CREATE POLICY "Role-scoped update personas"
ON public.personas
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'secretaria'::app_role)
  OR has_role(auth.uid(), 'consolidador_lider'::app_role)
  OR has_role(auth.uid(), 'consolidador'::app_role)
  OR has_role(auth.uid(), 'lider_casa_paz'::app_role)
  OR has_role(auth.uid(), 'lider_red'::app_role)
);