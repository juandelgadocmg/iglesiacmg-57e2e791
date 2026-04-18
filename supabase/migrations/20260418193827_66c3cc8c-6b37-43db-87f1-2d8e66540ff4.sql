-- Permitir a consolidadores leer la lista de procesos de crecimiento
DROP POLICY IF EXISTS "Role-scoped manage procesos_crecimiento" ON public.procesos_crecimiento;

CREATE POLICY "Role-scoped read procesos_crecimiento"
ON public.procesos_crecimiento
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'lider_red'::app_role)
  OR has_role(auth.uid(), 'lider_casa_paz'::app_role)
  OR has_role(auth.uid(), 'secretaria'::app_role)
  OR has_role(auth.uid(), 'consolidador'::app_role)
  OR has_role(auth.uid(), 'consolidador_lider'::app_role)
  OR has_role(auth.uid(), 'maestro'::app_role)
);

CREATE POLICY "Role-scoped write procesos_crecimiento"
ON public.procesos_crecimiento
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
);

-- Asegurar que persona_procesos también incluya lider_red y lider_casa_paz para consistencia
DROP POLICY IF EXISTS "Role-scoped manage persona_procesos" ON public.persona_procesos;

CREATE POLICY "Role-scoped manage persona_procesos"
ON public.persona_procesos
FOR ALL
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
  OR has_role(auth.uid(), 'lider_casa_paz'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'secretaria'::app_role)
  OR has_role(auth.uid(), 'consolidador_lider'::app_role)
  OR has_role(auth.uid(), 'consolidador'::app_role)
  OR has_role(auth.uid(), 'lider_red'::app_role)
  OR has_role(auth.uid(), 'lider_casa_paz'::app_role)
);