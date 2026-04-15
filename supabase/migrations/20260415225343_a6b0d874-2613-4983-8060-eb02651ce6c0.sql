
-- ============================================================
-- 1. Fix get_users_for_export to require admin role
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_users_for_export()
RETURNS TABLE(user_id uuid, display_name text, email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.display_name, u.email
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    ORDER BY p.display_name;
END;
$$;

-- ============================================================
-- 2. Fix user_roles: only super_admin can manage roles
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (
    has_role(auth.uid(), 'super_admin')
    OR (
      has_role(auth.uid(), 'admin')
      AND role != 'super_admin'
      AND role != 'admin'
    )
  );

-- ============================================================
-- 3. Fix personas table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view personas" ON public.personas;
DROP POLICY IF EXISTS "Authenticated can insert personas" ON public.personas;
DROP POLICY IF EXISTS "Authenticated can update personas" ON public.personas;
DROP POLICY IF EXISTS "Authenticated can delete personas" ON public.personas;

CREATE POLICY "Role-scoped read personas" ON public.personas
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria') OR has_role(auth.uid(), 'consolidador_lider')
    OR has_role(auth.uid(), 'consolidador') OR has_role(auth.uid(), 'lider_red')
    OR has_role(auth.uid(), 'maestro')
  );

CREATE POLICY "Role-scoped insert personas" ON public.personas
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria') OR has_role(auth.uid(), 'consolidador_lider')
  );

CREATE POLICY "Role-scoped update personas" ON public.personas
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria') OR has_role(auth.uid(), 'consolidador_lider')
    OR has_role(auth.uid(), 'consolidador')
  );

CREATE POLICY "Role-scoped delete personas" ON public.personas
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor')
  );

-- ============================================================
-- 4. Fix finanzas table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view finanzas" ON public.finanzas;
DROP POLICY IF EXISTS "Authenticated can insert finanzas" ON public.finanzas;
DROP POLICY IF EXISTS "Authenticated can update finanzas" ON public.finanzas;
DROP POLICY IF EXISTS "Authenticated can delete finanzas" ON public.finanzas;

CREATE POLICY "Role-scoped manage finanzas" ON public.finanzas
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'tesoreria') OR has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'tesoreria') OR has_role(auth.uid(), 'pastor')
  );

-- ============================================================
-- 5. Fix donaciones table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage donaciones" ON public.donaciones;

CREATE POLICY "Role-scoped manage donaciones" ON public.donaciones
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'tesoreria') OR has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'tesoreria') OR has_role(auth.uid(), 'pastor')
  );

-- ============================================================
-- 6. Fix categorias_financieras table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage categorias" ON public.categorias_financieras;

CREATE POLICY "Role-scoped manage categorias_financieras" ON public.categorias_financieras
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'tesoreria') OR has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'tesoreria') OR has_role(auth.uid(), 'pastor')
  );

-- ============================================================
-- 7. Fix peticiones_oracion table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view peticiones" ON public.peticiones_oracion;
DROP POLICY IF EXISTS "Authenticated can insert peticiones" ON public.peticiones_oracion;
DROP POLICY IF EXISTS "Authenticated can update peticiones" ON public.peticiones_oracion;
DROP POLICY IF EXISTS "Authenticated can delete peticiones" ON public.peticiones_oracion;

CREATE POLICY "Role-scoped manage peticiones" ON public.peticiones_oracion
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria') OR has_role(auth.uid(), 'consolidador_lider')
    OR has_role(auth.uid(), 'lider_intercesion')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria') OR has_role(auth.uid(), 'consolidador_lider')
    OR has_role(auth.uid(), 'lider_intercesion')
  );

-- ============================================================
-- 8. Fix reportes_grupos table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view reportes_grupos" ON public.reportes_grupos;
DROP POLICY IF EXISTS "Authenticated can insert reportes_grupos" ON public.reportes_grupos;
DROP POLICY IF EXISTS "Authenticated can update reportes_grupos" ON public.reportes_grupos;
DROP POLICY IF EXISTS "Authenticated can delete reportes_grupos" ON public.reportes_grupos;

CREATE POLICY "Role-scoped manage reportes_grupos" ON public.reportes_grupos
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'lider_red') OR has_role(auth.uid(), 'lider_casa_paz')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'lider_red') OR has_role(auth.uid(), 'lider_casa_paz')
  );

-- ============================================================
-- 9. Fix reporte_asistencia table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage reporte_asistencia" ON public.reporte_asistencia;

CREATE POLICY "Role-scoped manage reporte_asistencia" ON public.reporte_asistencia
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'lider_red') OR has_role(auth.uid(), 'lider_casa_paz')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'lider_red') OR has_role(auth.uid(), 'lider_casa_paz')
  );

-- ============================================================
-- 10. Fix calificaciones table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage calificaciones" ON public.calificaciones;

CREATE POLICY "Role-scoped manage calificaciones" ON public.calificaciones
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );

-- ============================================================
-- 11. Fix pagos_matricula table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage pagos_matricula" ON public.pagos_matricula;

CREATE POLICY "Role-scoped manage pagos_matricula" ON public.pagos_matricula
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
    OR has_role(auth.uid(), 'tesoreria')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
    OR has_role(auth.uid(), 'tesoreria')
  );

-- ============================================================
-- 12. Fix configuracion_iglesia write policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert config" ON public.configuracion_iglesia;
DROP POLICY IF EXISTS "Authenticated can update config" ON public.configuracion_iglesia;

CREATE POLICY "Admins can insert config" ON public.configuracion_iglesia
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update config" ON public.configuracion_iglesia
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 13. Fix asistencia table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage asistencia" ON public.asistencia;

CREATE POLICY "Role-scoped manage asistencia" ON public.asistencia
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  );

-- ============================================================
-- 14. Fix grupos table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view grupos" ON public.grupos;
DROP POLICY IF EXISTS "Authenticated can insert grupos" ON public.grupos;
DROP POLICY IF EXISTS "Authenticated can update grupos" ON public.grupos;
DROP POLICY IF EXISTS "Authenticated can delete grupos" ON public.grupos;

CREATE POLICY "Role-scoped read grupos" ON public.grupos
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'lider_red') OR has_role(auth.uid(), 'lider_casa_paz')
    OR has_role(auth.uid(), 'secretaria')
  );

CREATE POLICY "Role-scoped write grupos" ON public.grupos
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
  );

CREATE POLICY "Role-scoped update grupos" ON public.grupos
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
  );

CREATE POLICY "Role-scoped delete grupos" ON public.grupos
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor')
  );

-- ============================================================
-- 15. Fix grupo_miembros table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage grupo_miembros" ON public.grupo_miembros;

CREATE POLICY "Role-scoped manage grupo_miembros" ON public.grupo_miembros
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'lider_red') OR has_role(auth.uid(), 'lider_casa_paz')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'lider_red') OR has_role(auth.uid(), 'lider_casa_paz')
  );

-- ============================================================
-- 16. Fix eventos table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view eventos" ON public.eventos;
DROP POLICY IF EXISTS "Authenticated can insert eventos" ON public.eventos;
DROP POLICY IF EXISTS "Authenticated can update eventos" ON public.eventos;
DROP POLICY IF EXISTS "Authenticated can delete eventos" ON public.eventos;

CREATE POLICY "Role-scoped read eventos" ON public.eventos
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  );

CREATE POLICY "Role-scoped write eventos" ON public.eventos
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  );

-- ============================================================
-- 17. Fix inscripciones table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage inscripciones" ON public.inscripciones;

CREATE POLICY "Role-scoped manage inscripciones" ON public.inscripciones
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  );

-- ============================================================
-- 18. Fix servicios table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view servicios" ON public.servicios;
DROP POLICY IF EXISTS "Authenticated can insert servicios" ON public.servicios;
DROP POLICY IF EXISTS "Authenticated can update servicios" ON public.servicios;
DROP POLICY IF EXISTS "Authenticated can delete servicios" ON public.servicios;

CREATE POLICY "Role-scoped manage servicios" ON public.servicios
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  );

-- ============================================================
-- 19. Fix academia-related tables (materias, matriculas, etc.)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage materias" ON public.materias;
CREATE POLICY "Role-scoped manage materias" ON public.materias
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );

DROP POLICY IF EXISTS "Authenticated can manage matriculas" ON public.matriculas;
CREATE POLICY "Role-scoped manage matriculas" ON public.matriculas
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );

DROP POLICY IF EXISTS "Authenticated can manage items" ON public.items_calificables;
CREATE POLICY "Role-scoped manage items_calificables" ON public.items_calificables
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );

DROP POLICY IF EXISTS "Authenticated can manage asistencia_materias" ON public.asistencia_materias;
CREATE POLICY "Role-scoped manage asistencia_materias" ON public.asistencia_materias
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );

DROP POLICY IF EXISTS "Authenticated can manage periodos_academicos" ON public.periodos_academicos;
CREATE POLICY "Role-scoped manage periodos_academicos" ON public.periodos_academicos
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );

DROP POLICY IF EXISTS "Authenticated can manage cortes" ON public.cortes_academicos;
CREATE POLICY "Role-scoped manage cortes_academicos" ON public.cortes_academicos
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );

DROP POLICY IF EXISTS "Authenticated can manage conceptos_pago" ON public.conceptos_pago;
CREATE POLICY "Role-scoped manage conceptos_pago" ON public.conceptos_pago
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
    OR has_role(auth.uid(), 'tesoreria')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
    OR has_role(auth.uid(), 'tesoreria')
  );

DROP POLICY IF EXISTS "Authenticated can manage certificados" ON public.certificados;
CREATE POLICY "Role-scoped manage certificados" ON public.certificados
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );

DROP POLICY IF EXISTS "Authenticated can manage homologaciones" ON public.homologaciones;
CREATE POLICY "Role-scoped manage homologaciones" ON public.homologaciones
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );

DROP POLICY IF EXISTS "Authenticated can manage recursos_academicos" ON public.recursos_academicos;
CREATE POLICY "Role-scoped manage recursos_academicos" ON public.recursos_academicos
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );

-- ============================================================
-- 20. Fix cursos table RLS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view cursos" ON public.cursos;
DROP POLICY IF EXISTS "Authenticated can insert cursos" ON public.cursos;
DROP POLICY IF EXISTS "Authenticated can update cursos" ON public.cursos;
DROP POLICY IF EXISTS "Authenticated can delete cursos" ON public.cursos;

CREATE POLICY "Role-scoped manage cursos" ON public.cursos
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );

-- ============================================================
-- 21. Fix remaining tables
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage equipos_ministeriales" ON public.equipos_ministeriales;
CREATE POLICY "Role-scoped manage equipos_ministeriales" ON public.equipos_ministeriales
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor')
  );

DROP POLICY IF EXISTS "Authenticated can manage evento_categorias" ON public.evento_categorias;
CREATE POLICY "Role-scoped manage evento_categorias" ON public.evento_categorias
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  );

DROP POLICY IF EXISTS "Authenticated can manage evento_encargados" ON public.evento_encargados;
CREATE POLICY "Role-scoped manage evento_encargados" ON public.evento_encargados
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  );

DROP POLICY IF EXISTS "Authenticated can manage evento_servidores" ON public.evento_servidores;
CREATE POLICY "Role-scoped manage evento_servidores" ON public.evento_servidores
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria')
  );

DROP POLICY IF EXISTS "Authenticated can manage persona_procesos" ON public.persona_procesos;
CREATE POLICY "Role-scoped manage persona_procesos" ON public.persona_procesos
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria') OR has_role(auth.uid(), 'consolidador_lider')
    OR has_role(auth.uid(), 'consolidador')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria') OR has_role(auth.uid(), 'consolidador_lider')
    OR has_role(auth.uid(), 'consolidador')
  );

DROP POLICY IF EXISTS "Authenticated can manage procesos_crecimiento" ON public.procesos_crecimiento;
CREATE POLICY "Role-scoped manage procesos_crecimiento" ON public.procesos_crecimiento
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor')
  );

DROP POLICY IF EXISTS "Authenticated can manage relaciones_familiares" ON public.relaciones_familiares;
CREATE POLICY "Role-scoped manage relaciones_familiares" ON public.relaciones_familiares
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria') OR has_role(auth.uid(), 'consolidador_lider')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'secretaria') OR has_role(auth.uid(), 'consolidador_lider')
  );

DROP POLICY IF EXISTS "Authenticated can manage planificaciones" ON public.planificaciones_grupo;
CREATE POLICY "Role-scoped manage planificaciones_grupo" ON public.planificaciones_grupo
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'lider_red') OR has_role(auth.uid(), 'lider_casa_paz')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'lider_red') OR has_role(auth.uid(), 'lider_casa_paz')
  );

DROP POLICY IF EXISTS "Authenticated can manage aulas" ON public.aulas;
CREATE POLICY "Role-scoped manage aulas" ON public.aulas
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'maestro')
  );
