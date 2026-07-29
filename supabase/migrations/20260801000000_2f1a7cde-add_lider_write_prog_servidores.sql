-- Add lider to prog_servidores write policy so Líder can manage servidores in programación.
DROP POLICY IF EXISTS "prog_servidores write staff" ON public.prog_servidores;
CREATE POLICY "prog_servidores write staff" ON public.prog_servidores
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'lider_red'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'lider_red'::app_role)
);
