
-- 1) prog_disponibilidad: restrict SELECT
DROP POLICY IF EXISTS "prog_disp read" ON public.prog_disponibilidad;

CREATE POLICY "prog_disp read scoped"
ON public.prog_disponibilidad
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  OR public.has_role(auth.uid(), 'lider_red'::public.app_role)
  OR public.has_role(auth.uid(), 'lider'::public.app_role)
  OR public.has_role(auth.uid(), 'lider_casa_paz'::public.app_role)
  OR persona_id IN (
    SELECT persona_id FROM public.profiles
    WHERE user_id = auth.uid() AND persona_id IS NOT NULL
  )
);

-- 2) sem_persona_id_for_user: remove client-controlled metadata fallback
CREATE OR REPLACE FUNCTION public.sem_persona_id_for_user(_uid uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_persona_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- Verified link stored by trusted server logic (admins / reindex)
  SELECT p.persona_id INTO v_persona_id
  FROM public.profiles p
  WHERE p.user_id = _uid
    AND p.persona_id IS NOT NULL
  LIMIT 1;

  IF v_persona_id IS NOT NULL THEN
    RETURN v_persona_id;
  END IF;

  -- Verified link on enrollments (populated by triggers / admin reindex)
  SELECT i.persona_id INTO v_persona_id
  FROM public.sem_inscripciones i
  WHERE i.user_id = _uid
    AND i.persona_id IS NOT NULL
  ORDER BY i.created_at DESC
  LIMIT 1;

  RETURN v_persona_id;
END;
$function$;
