-- Resolver usuario de una persona priorizando vínculo manual de perfil y luego correo
CREATE OR REPLACE FUNCTION public.sem_resolve_user_id_from_persona(_persona_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  IF _persona_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.user_id
    INTO v_user_id
  FROM public.profiles p
  WHERE p.persona_id = _persona_id
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  SELECT per.email
    INTO v_email
  FROM public.personas per
  WHERE per.id = _persona_id;

  RETURN public.resolve_user_id_by_email(v_email);
END;
$$;

-- Consulta segura: devuelve solo la persona asociada al usuario actual
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
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT per.id, per.nombres, per.apellidos, per.documento, per.foto_url, per.email, per.telefono
  FROM public.profiles p
  JOIN public.personas per ON per.id = p.persona_id
  WHERE p.user_id = v_uid
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT per.id, per.nombres, per.apellidos, per.documento, per.foto_url, per.email, per.telefono
  FROM public.sem_inscripciones i
  JOIN public.personas per ON per.id = i.persona_id
  WHERE i.user_id = v_uid
  ORDER BY i.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  RETURN QUERY
  SELECT per.id, per.nombres, per.apellidos, per.documento, per.foto_url, per.email, per.telefono
  FROM public.personas per
  WHERE v_email IS NOT NULL
    AND per.email IS NOT NULL
    AND lower(trim(per.email)) = lower(trim(v_email))
  ORDER BY per.created_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sem_get_mi_persona() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sem_resolve_user_id_from_persona(uuid) TO authenticated, service_role;

-- Sincronizar perfiles existentes con personas por correo cuando todavía no tengan ficha manual
UPDATE public.profiles p
SET persona_id = per.id
FROM auth.users u
JOIN public.personas per
  ON lower(trim(per.email)) = lower(trim(u.email))
WHERE p.user_id = u.id
  AND p.persona_id IS NULL
  AND per.email IS NOT NULL
  AND trim(per.email) <> '';

-- Sincronizar inscripciones existentes con su usuario por perfil/correo
UPDATE public.sem_inscripciones i
SET user_id = public.sem_resolve_user_id_from_persona(i.persona_id)
WHERE i.persona_id IS NOT NULL
  AND (i.user_id IS NULL OR i.user_id <> public.sem_resolve_user_id_from_persona(i.persona_id))
  AND public.sem_resolve_user_id_from_persona(i.persona_id) IS NOT NULL;

-- Mantener sincronizadas las nuevas inscripciones o cambios de persona
CREATE OR REPLACE FUNCTION public.sem_inscripciones_set_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.persona_id IS NOT NULL
     AND (
       NEW.user_id IS NULL
       OR TG_OP = 'INSERT'
       OR OLD.persona_id IS DISTINCT FROM NEW.persona_id
     ) THEN
    NEW.user_id := public.sem_resolve_user_id_from_persona(NEW.persona_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sem_inscripciones_set_user_id ON public.sem_inscripciones;
CREATE TRIGGER trg_sem_inscripciones_set_user_id
BEFORE INSERT OR UPDATE OF persona_id, user_id
ON public.sem_inscripciones
FOR EACH ROW
EXECUTE FUNCTION public.sem_inscripciones_set_user_id();

-- Permitir que el estudiante de seminario vea solo su propia persona
DROP POLICY IF EXISTS "Seminario estudiantes leen su propia persona" ON public.personas;
CREATE POLICY "Seminario estudiantes leen su propia persona"
ON public.personas
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'seminario_estudiante'::public.app_role)
  AND (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.persona_id = personas.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.sem_inscripciones i
      WHERE i.user_id = auth.uid()
        AND i.persona_id = personas.id
    )
  )
);

-- Refuerzo: si una inscripción quedó sin user_id, también se permite lectura por ficha vinculada al perfil
DROP POLICY IF EXISTS "Seminario estudiantes leen sus inscripciones por perfil" ON public.sem_inscripciones;
CREATE POLICY "Seminario estudiantes leen sus inscripciones por perfil"
ON public.sem_inscripciones
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'seminario_estudiante'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.persona_id = sem_inscripciones.persona_id
  )
);

DROP POLICY IF EXISTS "Seminario estudiantes leen sus materias por perfil" ON public.sem_inscripcion_materias;
CREATE POLICY "Seminario estudiantes leen sus materias por perfil"
ON public.sem_inscripcion_materias
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'seminario_estudiante'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.sem_inscripciones i
    JOIN public.profiles p ON p.persona_id = i.persona_id
    WHERE i.id = sem_inscripcion_materias.inscripcion_id
      AND p.user_id = auth.uid()
  )
);