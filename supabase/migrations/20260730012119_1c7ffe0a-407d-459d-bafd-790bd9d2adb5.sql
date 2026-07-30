
CREATE OR REPLACE FUNCTION public.prog_can_manage(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'admin')
      OR public.has_role(_uid, 'super_admin')
      OR public.has_role(_uid, 'pastor')
      OR public.has_role(_uid, 'lider_red')
      OR public.has_role(_uid, 'lider');
$$;

-- Ministerios
DROP POLICY IF EXISTS "prog_ministerios write staff" ON public.prog_ministerios;
CREATE POLICY "prog_ministerios write staff" ON public.prog_ministerios
  FOR ALL TO authenticated
  USING (public.prog_can_manage(auth.uid()))
  WITH CHECK (public.prog_can_manage(auth.uid()));

-- Cargos
DROP POLICY IF EXISTS "prog_cargos write staff" ON public.prog_cargos;
CREATE POLICY "prog_cargos write staff" ON public.prog_cargos
  FOR ALL TO authenticated
  USING (public.prog_can_manage(auth.uid()))
  WITH CHECK (public.prog_can_manage(auth.uid()));

-- Eventos
DROP POLICY IF EXISTS "prog_eventos write staff" ON public.prog_eventos;
CREATE POLICY "prog_eventos write staff" ON public.prog_eventos
  FOR ALL TO authenticated
  USING (public.prog_can_manage(auth.uid()))
  WITH CHECK (public.prog_can_manage(auth.uid()));

-- Servidores
DROP POLICY IF EXISTS "prog_servidores write staff" ON public.prog_servidores;
CREATE POLICY "prog_servidores write staff" ON public.prog_servidores
  FOR ALL TO authenticated
  USING (public.prog_can_manage(auth.uid()))
  WITH CHECK (public.prog_can_manage(auth.uid()));

-- Disponibilidad
DROP POLICY IF EXISTS "prog_disp write staff" ON public.prog_disponibilidad;
CREATE POLICY "prog_disp write staff" ON public.prog_disponibilidad
  FOR ALL TO authenticated
  USING (public.prog_can_manage(auth.uid()))
  WITH CHECK (public.prog_can_manage(auth.uid()));

-- Asignaciones
DROP POLICY IF EXISTS "prog_asign write staff" ON public.prog_asignaciones;
CREATE POLICY "prog_asign write staff" ON public.prog_asignaciones
  FOR ALL TO authenticated
  USING (public.prog_can_manage(auth.uid()))
  WITH CHECK (public.prog_can_manage(auth.uid()));

-- Textos de evento
DROP POLICY IF EXISTS "prog_textos_write_staff" ON public.prog_evento_textos;
CREATE POLICY "prog_textos_write_staff" ON public.prog_evento_textos
  FOR ALL TO authenticated
  USING (public.prog_can_manage(auth.uid()) OR public.has_role(auth.uid(), 'maestro'))
  WITH CHECK (public.prog_can_manage(auth.uid()) OR public.has_role(auth.uid(), 'maestro'));

DROP POLICY IF EXISTS "prog_textos_select_staff" ON public.prog_evento_textos;
CREATE POLICY "prog_textos_select_staff" ON public.prog_evento_textos
  FOR SELECT TO authenticated
  USING (public.prog_can_manage(auth.uid()) OR public.has_role(auth.uid(), 'maestro'));

-- Reemplazos: líderes pueden gestionar
DROP POLICY IF EXISTS "prog_reemplazos update own or staff" ON public.prog_reemplazos;
CREATE POLICY "prog_reemplazos update own or staff" ON public.prog_reemplazos
  FOR UPDATE TO authenticated
  USING (public.prog_can_manage(auth.uid()) OR persona_solicita_id = public.sem_persona_id_for_user(auth.uid()))
  WITH CHECK (public.prog_can_manage(auth.uid()) OR persona_solicita_id = public.sem_persona_id_for_user(auth.uid()));

DROP POLICY IF EXISTS "prog_reemplazos delete own or staff" ON public.prog_reemplazos;
CREATE POLICY "prog_reemplazos delete own or staff" ON public.prog_reemplazos
  FOR DELETE TO authenticated
  USING (public.prog_can_manage(auth.uid()) OR persona_solicita_id = public.sem_persona_id_for_user(auth.uid()));

DROP POLICY IF EXISTS "prog_reemplazos read scoped" ON public.prog_reemplazos;
CREATE POLICY "prog_reemplazos read scoped" ON public.prog_reemplazos
  FOR SELECT TO authenticated
  USING (
    public.prog_can_manage(auth.uid())
    OR persona_solicita_id = public.sem_persona_id_for_user(auth.uid())
    OR persona_reemplazo_id = public.sem_persona_id_for_user(auth.uid())
    OR persona_solicita_id IN (SELECT p.persona_id FROM public.profiles p WHERE p.user_id = auth.uid() AND p.persona_id IS NOT NULL)
    OR persona_reemplazo_id IN (SELECT p.persona_id FROM public.profiles p WHERE p.user_id = auth.uid() AND p.persona_id IS NOT NULL)
  );

-- Auditoría de programación
DROP POLICY IF EXISTS "Insert own prog_audit" ON public.prog_audit_log;
CREATE POLICY "Insert own prog_audit" ON public.prog_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid() OR public.prog_can_manage(auth.uid()));

DROP POLICY IF EXISTS "Staff read prog_audit" ON public.prog_audit_log;
CREATE POLICY "Staff read prog_audit" ON public.prog_audit_log
  FOR SELECT TO authenticated
  USING (public.prog_can_manage(auth.uid()));
