
-- =====================================================================
-- Endurecimiento RLS: reemplazar políticas laxas y basadas en JWT email
-- =====================================================================

-- 1) prog_eventos: restringir lectura a staff / líderes / personas asignadas
DROP POLICY IF EXISTS "prog_eventos read" ON public.prog_eventos;

CREATE POLICY "prog_eventos read scoped"
ON public.prog_eventos
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  OR public.has_role(auth.uid(), 'lider_red'::public.app_role)
  OR public.has_role(auth.uid(), 'lider'::public.app_role)
  OR public.has_role(auth.uid(), 'lider_casa_paz'::public.app_role)
  OR public.has_role(auth.uid(), 'maestro'::public.app_role)
  OR public.has_role(auth.uid(), 'seminario_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'seminario_docente'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.prog_asignaciones a
    WHERE a.evento_id = prog_eventos.id
      AND (
        a.persona_id = public.sem_persona_id_for_user(auth.uid())
        OR a.persona_id IN (
          SELECT p.persona_id FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.persona_id IS NOT NULL
        )
      )
  )
);

-- 2) prog_servidores: restringir lectura a staff o a la propia persona
DROP POLICY IF EXISTS "prog_servidores read" ON public.prog_servidores;

CREATE POLICY "prog_servidores read scoped"
ON public.prog_servidores
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
  OR persona_id IN (
    SELECT p.persona_id FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.persona_id IS NOT NULL
  )
);

-- 3) prog_cargos: catálogo pequeño, restringir a usuarios autenticados
DROP POLICY IF EXISTS "prog_cargos read" ON public.prog_cargos;

CREATE POLICY "prog_cargos read authenticated"
ON public.prog_cargos
FOR SELECT
TO authenticated
USING (true);

-- 4) prog_reemplazos: eliminar dependencia de auth.jwt() ->> 'email'
DROP POLICY IF EXISTS "Read own or staff prog_reemplazos"   ON public.prog_reemplazos;
DROP POLICY IF EXISTS "Insert own prog_reemplazos"          ON public.prog_reemplazos;
DROP POLICY IF EXISTS "Update own or staff prog_reemplazos" ON public.prog_reemplazos;
DROP POLICY IF EXISTS "Delete own or staff prog_reemplazos" ON public.prog_reemplazos;

CREATE POLICY "prog_reemplazos read scoped"
ON public.prog_reemplazos
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  OR public.has_role(auth.uid(), 'lider_red'::public.app_role)
  OR persona_solicita_id  = public.sem_persona_id_for_user(auth.uid())
  OR persona_reemplazo_id = public.sem_persona_id_for_user(auth.uid())
  OR persona_solicita_id IN (
    SELECT p.persona_id FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.persona_id IS NOT NULL
  )
  OR persona_reemplazo_id IN (
    SELECT p.persona_id FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.persona_id IS NOT NULL
  )
);

CREATE POLICY "prog_reemplazos insert own"
ON public.prog_reemplazos
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  OR persona_solicita_id = public.sem_persona_id_for_user(auth.uid())
  OR persona_solicita_id IN (
    SELECT p.persona_id FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.persona_id IS NOT NULL
  )
);

CREATE POLICY "prog_reemplazos update own or staff"
ON public.prog_reemplazos
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  OR public.has_role(auth.uid(), 'lider_red'::public.app_role)
  OR persona_solicita_id = public.sem_persona_id_for_user(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  OR public.has_role(auth.uid(), 'lider_red'::public.app_role)
  OR persona_solicita_id = public.sem_persona_id_for_user(auth.uid())
);

CREATE POLICY "prog_reemplazos delete own or staff"
ON public.prog_reemplazos
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  OR persona_solicita_id = public.sem_persona_id_for_user(auth.uid())
);
