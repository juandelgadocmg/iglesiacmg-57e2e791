-- Helpers seguros para resolver vínculos de Seminario sin depender de políticas anidadas
CREATE OR REPLACE FUNCTION public.sem_is_staff(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_uid,'admin'::public.app_role)
      OR public.has_role(_uid,'super_admin'::public.app_role)
      OR public.has_role(_uid,'pastor'::public.app_role)
      OR public.has_role(_uid,'seminario_admin'::public.app_role)
      OR public.has_role(_uid,'seminario_docente'::public.app_role)
      OR public.has_role(_uid,'maestro'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.sem_persona_id_for_user(_uid uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_persona_id uuid;
  v_email text;
  v_documento text;
BEGIN
  IF _uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.persona_id INTO v_persona_id
  FROM public.profiles p
  WHERE p.user_id = _uid
    AND p.persona_id IS NOT NULL
  LIMIT 1;

  IF v_persona_id IS NOT NULL THEN
    RETURN v_persona_id;
  END IF;

  SELECT i.persona_id INTO v_persona_id
  FROM public.sem_inscripciones i
  WHERE i.user_id = _uid
    AND i.persona_id IS NOT NULL
  ORDER BY i.created_at DESC
  LIMIT 1;

  IF v_persona_id IS NOT NULL THEN
    RETURN v_persona_id;
  END IF;

  SELECT lower(trim(u.email)), nullif(regexp_replace(coalesce(
           u.raw_user_meta_data->>'documento',
           u.raw_user_meta_data->>'document',
           u.raw_user_meta_data->>'cedula',
           u.raw_user_meta_data->>'identification',
           u.raw_user_meta_data->>'numero_documento',
           ''
         ), '\D', '', 'g'), '')
    INTO v_email, v_documento
  FROM auth.users u
  WHERE u.id = _uid;

  IF v_email IS NOT NULL AND v_email <> '' THEN
    SELECT per.id INTO v_persona_id
    FROM public.personas per
    WHERE per.email IS NOT NULL
      AND lower(trim(per.email)) = v_email
    ORDER BY per.created_at DESC
    LIMIT 1;

    IF v_persona_id IS NOT NULL THEN
      RETURN v_persona_id;
    END IF;
  END IF;

  IF v_documento IS NOT NULL AND v_documento <> '' THEN
    SELECT per.id INTO v_persona_id
    FROM public.personas per
    WHERE regexp_replace(coalesce(per.documento, ''), '\D', '', 'g') = v_documento
    ORDER BY per.created_at DESC
    LIMIT 1;
  END IF;

  RETURN v_persona_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sem_resolve_user_id_from_persona(_persona_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_documento text;
BEGIN
  IF _persona_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.user_id INTO v_user_id
  FROM public.profiles p
  WHERE p.persona_id = _persona_id
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  SELECT lower(trim(per.email)), nullif(regexp_replace(coalesce(per.documento, ''), '\D', '', 'g'), '')
    INTO v_email, v_documento
  FROM public.personas per
  WHERE per.id = _persona_id;

  IF v_email IS NOT NULL AND v_email <> '' THEN
    SELECT u.id INTO v_user_id
    FROM auth.users u
    WHERE lower(trim(u.email)) = v_email
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      RETURN v_user_id;
    END IF;
  END IF;

  IF v_documento IS NOT NULL AND v_documento <> '' THEN
    SELECT u.id INTO v_user_id
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE nullif(regexp_replace(coalesce(
            u.raw_user_meta_data->>'documento',
            u.raw_user_meta_data->>'document',
            u.raw_user_meta_data->>'cedula',
            u.raw_user_meta_data->>'identification',
            u.raw_user_meta_data->>'numero_documento',
            p.display_name,
            ''
          ), '\D', '', 'g'), '') = v_documento
    LIMIT 1;
  END IF;

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sem_get_mi_persona()
RETURNS TABLE (
  id uuid,
  nombres text,
  apellidos text,
  documento text,
  foto_url text,
  email text,
  telefono text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_persona_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  v_persona_id := public.sem_persona_id_for_user(v_uid);

  IF v_persona_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT per.id, per.nombres, per.apellidos, per.documento, per.foto_url, per.email, per.telefono
  FROM public.personas per
  WHERE per.id = v_persona_id
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.sem_user_owns_inscripcion(_inscripcion_id uuid, _uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sem_inscripciones i
    WHERE i.id = _inscripcion_id
      AND (
        i.user_id = _uid
        OR i.persona_id = public.sem_persona_id_for_user(_uid)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.sem_user_owns_inscripcion_materia(_inscripcion_materia_id uuid, _uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sem_inscripcion_materias im
    JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
    WHERE im.id = _inscripcion_materia_id
      AND (
        i.user_id = _uid
        OR i.persona_id = public.sem_persona_id_for_user(_uid)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.sem_user_enrolled_materia(_materia_id uuid, _uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sem_inscripcion_materias im
    JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
    WHERE im.materia_id = _materia_id
      AND (
        i.user_id = _uid
        OR i.persona_id = public.sem_persona_id_for_user(_uid)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.sem_user_enrolled_oferta(_oferta_id uuid, _uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sem_inscripcion_materias im
    JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
    WHERE im.oferta_id = _oferta_id
      AND (
        i.user_id = _uid
        OR i.persona_id = public.sem_persona_id_for_user(_uid)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.sem_user_enrolled_periodo(_periodo_id uuid, _uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sem_inscripciones i
    WHERE i.periodo_id = _periodo_id
      AND (
        i.user_id = _uid
        OR i.persona_id = public.sem_persona_id_for_user(_uid)
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.sem_inscripcion_materias im
    JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
    JOIN public.sem_ofertas o ON o.id = im.oferta_id
    WHERE o.periodo_id = _periodo_id
      AND (
        i.user_id = _uid
        OR i.persona_id = public.sem_persona_id_for_user(_uid)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.sem_user_enrolled_programa(_programa_id uuid, _uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sem_inscripciones i
    WHERE i.programa_id = _programa_id
      AND (
        i.user_id = _uid
        OR i.persona_id = public.sem_persona_id_for_user(_uid)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.sem_user_enrolled_foro(_foro_id uuid, _uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sem_foros f
    WHERE f.id = _foro_id
      AND public.sem_user_enrolled_oferta(f.oferta_id, _uid)
  )
$$;

CREATE OR REPLACE FUNCTION public.sem_user_can_read_recurso(_materia_id uuid, _periodo_id uuid, _programa_id uuid, _uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    (_materia_id IS NOT NULL AND public.sem_user_enrolled_materia(_materia_id, _uid)
      AND (_periodo_id IS NULL OR public.sem_user_enrolled_periodo(_periodo_id, _uid)))
    OR (_programa_id IS NOT NULL AND public.sem_user_enrolled_programa(_programa_id, _uid))
  )
$$;

-- Sincronización manual/reindexación para administradores de Seminario
CREATE OR REPLACE FUNCTION public.sem_reindex_vinculos()
RETURNS TABLE (
  profiles_vinculados integer,
  inscripciones_vinculadas integer,
  inscripciones_sin_usuario integer,
  estudiantes_sin_materias integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profiles integer := 0;
  v_inscripciones integer := 0;
  v_sin_usuario integer := 0;
  v_sin_materias integer := 0;
BEGIN
  IF NOT public.sem_is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'No tienes permiso para sincronizar Seminario';
  END IF;

  WITH candidates AS (
    SELECT p.user_id, per.id AS persona_id
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    JOIN public.personas per ON (
      (per.email IS NOT NULL AND u.email IS NOT NULL AND lower(trim(per.email)) = lower(trim(u.email)))
      OR (
        nullif(regexp_replace(coalesce(per.documento, ''), '\D', '', 'g'), '') IS NOT NULL
        AND nullif(regexp_replace(coalesce(
          u.raw_user_meta_data->>'documento',
          u.raw_user_meta_data->>'document',
          u.raw_user_meta_data->>'cedula',
          u.raw_user_meta_data->>'identification',
          u.raw_user_meta_data->>'numero_documento',
          p.display_name,
          ''
        ), '\D', '', 'g'), '') = nullif(regexp_replace(coalesce(per.documento, ''), '\D', '', 'g'), '')
      )
    )
    WHERE p.persona_id IS NULL
  ), ranked AS (
    SELECT user_id, persona_id, row_number() OVER (PARTITION BY user_id ORDER BY persona_id) AS rn
    FROM candidates
  ), upd AS (
    UPDATE public.profiles p
    SET persona_id = r.persona_id
    FROM ranked r
    WHERE p.user_id = r.user_id
      AND p.persona_id IS NULL
      AND r.rn = 1
    RETURNING p.user_id
  )
  SELECT count(*)::integer INTO v_profiles FROM upd;

  WITH resolved AS (
    SELECT i.id, public.sem_resolve_user_id_from_persona(i.persona_id) AS resolved_user_id
    FROM public.sem_inscripciones i
    WHERE i.persona_id IS NOT NULL
  ), upd AS (
    UPDATE public.sem_inscripciones i
    SET user_id = r.resolved_user_id
    FROM resolved r
    WHERE i.id = r.id
      AND r.resolved_user_id IS NOT NULL
      AND i.user_id IS DISTINCT FROM r.resolved_user_id
    RETURNING i.id
  )
  SELECT count(*)::integer INTO v_inscripciones FROM upd;

  SELECT count(*)::integer INTO v_sin_usuario
  FROM public.sem_inscripciones i
  WHERE i.user_id IS NULL;

  SELECT count(*)::integer INTO v_sin_materias
  FROM public.sem_inscripciones i
  WHERE NOT EXISTS (
    SELECT 1 FROM public.sem_inscripcion_materias im WHERE im.inscripcion_id = i.id
  );

  RETURN QUERY SELECT v_profiles, v_inscripciones, v_sin_usuario, v_sin_materias;
END;
$$;

CREATE OR REPLACE FUNCTION public.sem_usuario_vinculacion_status()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  persona_id uuid,
  persona_nombre text,
  persona_documento text,
  roles text[],
  inscripciones_count integer,
  materias_count integer,
  has_student_role boolean,
  estado text,
  detalle text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
          OR public.has_role(auth.uid(), 'pastor'::public.app_role)
          OR public.has_role(auth.uid(), 'seminario_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'No tienes permiso para ver el estado de vinculación';
  END IF;

  RETURN QUERY
  WITH role_map AS (
    SELECT ur.user_id, array_agg(ur.role::text ORDER BY ur.role::text) AS roles
    FROM public.user_roles ur
    GROUP BY ur.user_id
  ), base AS (
    SELECT
      p.user_id,
      p.display_name,
      u.email,
      coalesce(p.persona_id, public.sem_persona_id_for_user(p.user_id)) AS resolved_persona_id,
      coalesce(r.roles, ARRAY[]::text[]) AS roles
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    LEFT JOIN role_map r ON r.user_id = p.user_id
    WHERE 'seminario_estudiante' = ANY(coalesce(r.roles, ARRAY[]::text[]))
       OR 'seminario_docente' = ANY(coalesce(r.roles, ARRAY[]::text[]))
       OR 'seminario_admin' = ANY(coalesce(r.roles, ARRAY[]::text[]))
       OR EXISTS (SELECT 1 FROM public.sem_inscripciones i WHERE i.user_id = p.user_id OR i.persona_id = p.persona_id)
  ), counts AS (
    SELECT
      b.user_id,
      count(DISTINCT i.id)::integer AS inscripciones_count,
      count(DISTINCT im.id)::integer AS materias_count
    FROM base b
    LEFT JOIN public.sem_inscripciones i ON i.user_id = b.user_id OR (b.resolved_persona_id IS NOT NULL AND i.persona_id = b.resolved_persona_id)
    LEFT JOIN public.sem_inscripcion_materias im ON im.inscripcion_id = i.id
    GROUP BY b.user_id
  )
  SELECT
    b.user_id,
    b.display_name,
    b.email,
    per.id AS persona_id,
    trim(concat(coalesce(per.nombres, ''), ' ', coalesce(per.apellidos, ''))) AS persona_nombre,
    per.documento AS persona_documento,
    b.roles,
    coalesce(c.inscripciones_count, 0) AS inscripciones_count,
    coalesce(c.materias_count, 0) AS materias_count,
    ('seminario_estudiante' = ANY(b.roles)) AS has_student_role,
    CASE
      WHEN per.id IS NULL THEN 'sin_persona'
      WHEN coalesce(c.inscripciones_count, 0) = 0 AND 'seminario_estudiante' = ANY(b.roles) THEN 'sin_inscripcion'
      WHEN coalesce(c.materias_count, 0) = 0 AND 'seminario_estudiante' = ANY(b.roles) THEN 'sin_materias'
      ELSE 'ok'
    END AS estado,
    CASE
      WHEN per.id IS NULL THEN 'Usuario sin persona vinculada para Seminario'
      WHEN coalesce(c.inscripciones_count, 0) = 0 AND 'seminario_estudiante' = ANY(b.roles) THEN 'Tiene rol de estudiante, pero no tiene inscripción de Seminario'
      WHEN coalesce(c.materias_count, 0) = 0 AND 'seminario_estudiante' = ANY(b.roles) THEN 'Tiene inscripción, pero no hay materias matriculadas visibles'
      ELSE 'Vinculación correcta'
    END AS detalle
  FROM base b
  LEFT JOIN public.personas per ON per.id = b.resolved_persona_id
  LEFT JOIN counts c ON c.user_id = b.user_id
  ORDER BY estado DESC, b.display_name;
END;
$$;

-- Aplicar sincronización inicial sin requerir sesión de usuario
WITH candidates AS (
  SELECT p.user_id, per.id AS persona_id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  JOIN public.personas per ON (
    (per.email IS NOT NULL AND u.email IS NOT NULL AND lower(trim(per.email)) = lower(trim(u.email)))
    OR (
      nullif(regexp_replace(coalesce(per.documento, ''), '\D', '', 'g'), '') IS NOT NULL
      AND nullif(regexp_replace(coalesce(
        u.raw_user_meta_data->>'documento',
        u.raw_user_meta_data->>'document',
        u.raw_user_meta_data->>'cedula',
        u.raw_user_meta_data->>'identification',
        u.raw_user_meta_data->>'numero_documento',
        p.display_name,
        ''
      ), '\D', '', 'g'), '') = nullif(regexp_replace(coalesce(per.documento, ''), '\D', '', 'g'), '')
    )
  )
  WHERE p.persona_id IS NULL
), ranked AS (
  SELECT user_id, persona_id, row_number() OVER (PARTITION BY user_id ORDER BY persona_id) AS rn
  FROM candidates
)
UPDATE public.profiles p
SET persona_id = r.persona_id
FROM ranked r
WHERE p.user_id = r.user_id
  AND p.persona_id IS NULL
  AND r.rn = 1;

UPDATE public.sem_inscripciones i
SET user_id = public.sem_resolve_user_id_from_persona(i.persona_id)
WHERE i.persona_id IS NOT NULL
  AND public.sem_resolve_user_id_from_persona(i.persona_id) IS NOT NULL
  AND i.user_id IS DISTINCT FROM public.sem_resolve_user_id_from_persona(i.persona_id);

-- Políticas RLS de lectura enfocadas en la inscripción del estudiante
DROP POLICY IF EXISTS "lect inscripciones" ON public.sem_inscripciones;
DROP POLICY IF EXISTS "Seminario estudiantes leen sus inscripciones por perfil" ON public.sem_inscripciones;
CREATE POLICY "sem_inscripciones lectura por rol o propia"
ON public.sem_inscripciones
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_is_tesoreria((SELECT auth.uid()))
  OR public.sem_user_owns_inscripcion(id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect cursadas" ON public.sem_inscripcion_materias;
DROP POLICY IF EXISTS "Seminario estudiantes leen sus materias por perfil" ON public.sem_inscripcion_materias;
CREATE POLICY "sem_inscripcion_materias lectura por rol o propia"
ON public.sem_inscripcion_materias
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_is_tesoreria((SELECT auth.uid()))
  OR public.sem_user_owns_inscripcion_materia(id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect materias" ON public.sem_materias;
CREATE POLICY "sem_materias lectura staff o matriculada"
ON public.sem_materias
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_materia(id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect ofertas" ON public.sem_ofertas;
CREATE POLICY "sem_ofertas lectura staff o matriculada"
ON public.sem_ofertas
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_oferta(id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect periodos" ON public.sem_periodos;
CREATE POLICY "sem_periodos lectura staff o vinculada"
ON public.sem_periodos
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_periodo(id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect eval" ON public.sem_evaluaciones;
CREATE POLICY "sem_evaluaciones lectura staff o publicada del curso"
ON public.sem_evaluaciones
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR (publicada = true AND public.sem_user_enrolled_oferta(oferta_id, (SELECT auth.uid())))
);

DROP POLICY IF EXISTS "lect recursos" ON public.sem_recursos;
CREATE POLICY "sem_recursos lectura staff o recurso propio"
ON public.sem_recursos
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR (publicado = true AND public.sem_user_can_read_recurso(materia_id, periodo_id, programa_id, (SELECT auth.uid())))
);

DROP POLICY IF EXISTS "lect anuncios" ON public.sem_anuncios;
CREATE POLICY "sem_anuncios lectura staff o curso propio"
ON public.sem_anuncios
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_oferta(oferta_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect notas" ON public.sem_calificaciones;
CREATE POLICY "sem_calificaciones lectura staff o propia"
ON public.sem_calificaciones
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_owns_inscripcion_materia(inscripcion_materia_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect asist" ON public.sem_asistencias;
CREATE POLICY "sem_asistencias lectura staff o propia"
ON public.sem_asistencias
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_owns_inscripcion_materia(inscripcion_materia_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "staff lee entregas" ON public.sem_entregas;
CREATE POLICY "sem_entregas lectura staff o propia"
ON public.sem_entregas
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR user_id = (SELECT auth.uid())
  OR public.sem_user_owns_inscripcion_materia(inscripcion_materia_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "estudiante crea/edita entrega propia" ON public.sem_entregas;
CREATE POLICY "sem_entregas crear propia"
ON public.sem_entregas
FOR INSERT
TO authenticated
WITH CHECK (
  public.sem_is_staff((SELECT auth.uid()))
  OR (
    user_id = (SELECT auth.uid())
    AND persona_id = public.sem_persona_id_for_user((SELECT auth.uid()))
    AND public.sem_user_owns_inscripcion_materia(inscripcion_materia_id, (SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS "estudiante actualiza entrega propia" ON public.sem_entregas;
CREATE POLICY "sem_entregas actualizar propia o staff"
ON public.sem_entregas
FOR UPDATE
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR user_id = (SELECT auth.uid())
  OR public.sem_user_owns_inscripcion_materia(inscripcion_materia_id, (SELECT auth.uid()))
)
WITH CHECK (
  public.sem_is_staff((SELECT auth.uid()))
  OR (
    user_id = (SELECT auth.uid())
    AND persona_id = public.sem_persona_id_for_user((SELECT auth.uid()))
    AND public.sem_user_owns_inscripcion_materia(inscripcion_materia_id, (SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS "borrar entrega" ON public.sem_entregas;
CREATE POLICY "sem_entregas borrar propia o staff"
ON public.sem_entregas
FOR DELETE
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "lect lecturas propio o staff" ON public.sem_anuncios_lecturas;
CREATE POLICY "sem_anuncios_lecturas lectura propia o staff"
ON public.sem_anuncios_lecturas
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "crear lectura propia" ON public.sem_anuncios_lecturas;
CREATE POLICY "sem_anuncios_lecturas crear propia"
ON public.sem_anuncios_lecturas
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND persona_id = public.sem_persona_id_for_user((SELECT auth.uid()))
);

DROP POLICY IF EXISTS "borrar lectura propia o staff" ON public.sem_anuncios_lecturas;
CREATE POLICY "sem_anuncios_lecturas borrar propia o staff"
ON public.sem_anuncios_lecturas
FOR DELETE
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "lect foros" ON public.sem_foros;
CREATE POLICY "sem_foros lectura staff o curso propio"
ON public.sem_foros
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_oferta(oferta_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "crear foro" ON public.sem_foros;
CREATE POLICY "sem_foros crear staff o curso propio"
ON public.sem_foros
FOR INSERT
TO authenticated
WITH CHECK (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_oferta(oferta_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "lect mensajes foro" ON public.sem_foro_mensajes;
CREATE POLICY "sem_foro_mensajes lectura staff o curso propio"
ON public.sem_foro_mensajes
FOR SELECT
TO authenticated
USING (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_foro(foro_id, (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "crear mensaje foro" ON public.sem_foro_mensajes;
CREATE POLICY "sem_foro_mensajes crear staff o curso propio"
ON public.sem_foro_mensajes
FOR INSERT
TO authenticated
WITH CHECK (
  public.sem_is_staff((SELECT auth.uid()))
  OR public.sem_user_enrolled_foro(foro_id, (SELECT auth.uid()))
);

-- Garantizar permisos de ejecución de RPCs usados por cliente y RLS
REVOKE ALL ON FUNCTION public.sem_persona_id_for_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_user_owns_inscripcion(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_user_owns_inscripcion_materia(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_user_enrolled_materia(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_user_enrolled_oferta(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_user_enrolled_periodo(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_user_enrolled_programa(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_user_enrolled_foro(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_user_can_read_recurso(uuid, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_reindex_vinculos() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_usuario_vinculacion_status() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sem_persona_id_for_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_user_owns_inscripcion(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_user_owns_inscripcion_materia(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_user_enrolled_materia(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_user_enrolled_oferta(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_user_enrolled_periodo(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_user_enrolled_programa(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_user_enrolled_foro(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_user_can_read_recurso(uuid, uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_get_mi_persona() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_resolve_user_id_from_persona(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_reindex_vinculos() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sem_usuario_vinculacion_status() TO authenticated, service_role;