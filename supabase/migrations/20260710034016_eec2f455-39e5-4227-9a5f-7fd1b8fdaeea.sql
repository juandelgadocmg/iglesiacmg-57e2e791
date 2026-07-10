DROP POLICY IF EXISTS "lect publica programas" ON public.sem_programas;
CREATE POLICY "sem_programas lectura staff o programa propio"
ON public.sem_programas
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_programa(id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect semestres" ON public.sem_pensum_semestres;
CREATE POLICY "sem_pensum_semestres lectura staff o programa propio"
ON public.sem_pensum_semestres
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_programa(programa_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect pensum-mat" ON public.sem_pensum_materias;
CREATE POLICY "sem_pensum_materias lectura staff o programa propio"
ON public.sem_pensum_materias
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM public.sem_pensum_semestres s
    WHERE s.id = sem_pensum_materias.semestre_id
      AND public.sem_user_enrolled_programa(s.programa_id, (SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS "lect prereq" ON public.sem_materia_prerequisitos;
CREATE POLICY "sem_materia_prerequisitos lectura staff o materia propia"
ON public.sem_materia_prerequisitos
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_materia(materia_id, (SELECT auth.uid()))
  OR public.sem_user_enrolled_materia(prerequisito_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect pagos" ON public.sem_pagos_inscripcion;
CREATE POLICY "sem_pagos_inscripcion lectura tesoreria o propia"
ON public.sem_pagos_inscripcion
FOR SELECT
TO authenticated
USING (
  public.sem_is_tesoreria((SELECT auth.uid()))
  OR public.sem_user_owns_inscripcion(inscripcion_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect zoom staff o inscritos" ON public.sem_zoom_sesiones;
CREATE POLICY "sem_zoom_sesiones lectura staff o curso propio"
ON public.sem_zoom_sesiones
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_oferta(oferta_id, (SELECT auth.uid()))
);