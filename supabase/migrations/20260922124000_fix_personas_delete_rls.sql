-- Update Role-scoped delete personas policy to match UI permissions
DROP POLICY IF EXISTS "Role-scoped delete personas" ON public.personas;

CREATE POLICY "Role-scoped delete personas" ON public.personas
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'secretaria')
    OR has_role(auth.uid(), 'lider')
  );
