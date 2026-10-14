-- =====================================================================
-- Migration: Fix Personas Delete RLS Policy
-- =====================================================================
-- Issue: "Error RLS al eliminar personas: Al intentar borrar una persona 
-- desde el Directorio o Dashboard, la base de datos lo rechaza por violación 
-- RLS, a pesar de que el usuario tiene permisos en la interfaz."
-- Fix: Update the 'Role-scoped delete personas' policy to match the UI 
-- permissions (which allows 'secretaria' and 'lider').

DROP POLICY IF EXISTS "Role-scoped delete personas" ON public.personas;
DROP POLICY IF EXISTS "Authenticated can delete personas" ON public.personas;

CREATE POLICY "Role-scoped delete personas" ON public.personas
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'pastor') OR 
    has_role(auth.uid(), 'secretaria') OR 
    has_role(auth.uid(), 'lider')
  );
