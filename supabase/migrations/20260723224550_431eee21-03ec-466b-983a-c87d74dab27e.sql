DROP POLICY IF EXISTS "Staff manage iso templates" ON public.prog_iso_templates;
CREATE POLICY "Staff manage iso templates" ON public.prog_iso_templates
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'lider_red'::app_role)
  OR has_role(auth.uid(), 'lider_intercesion'::app_role)
  OR has_role(auth.uid(), 'secretaria'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'lider_red'::app_role)
  OR has_role(auth.uid(), 'lider_intercesion'::app_role)
  OR has_role(auth.uid(), 'secretaria'::app_role)
);