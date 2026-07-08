DROP POLICY IF EXISTS "Users can update own profile basic fields" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.prevent_profile_persona_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() = NEW.user_id
     AND NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
     AND OLD.persona_id IS DISTINCT FROM NEW.persona_id THEN
    RAISE EXCEPTION 'No puedes cambiar la persona vinculada a tu propio usuario.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_persona_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_persona_self_update
BEFORE UPDATE OF persona_id
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_persona_self_update();

REVOKE ALL ON FUNCTION public.prevent_profile_persona_self_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_profile_persona_self_update() FROM anon;