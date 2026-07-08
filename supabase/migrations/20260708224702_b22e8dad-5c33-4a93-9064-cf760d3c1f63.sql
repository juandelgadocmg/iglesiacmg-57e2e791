CREATE OR REPLACE FUNCTION public.sem_sync_inscripciones_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.persona_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.persona_id IS DISTINCT FROM NEW.persona_id) THEN
    UPDATE public.sem_inscripciones
    SET user_id = NEW.user_id
    WHERE persona_id = NEW.persona_id
      AND (user_id IS NULL OR user_id <> NEW.user_id);
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.persona_id IS NOT NULL
     AND OLD.persona_id IS DISTINCT FROM NEW.persona_id THEN
    UPDATE public.sem_inscripciones
    SET user_id = public.sem_resolve_user_id_from_persona(OLD.persona_id)
    WHERE persona_id = OLD.persona_id
      AND user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sem_sync_inscripciones_from_profile ON public.profiles;
CREATE TRIGGER trg_sem_sync_inscripciones_from_profile
AFTER INSERT OR UPDATE OF persona_id
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sem_sync_inscripciones_from_profile();

REVOKE ALL ON FUNCTION public.sem_sync_inscripciones_from_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sem_sync_inscripciones_from_profile() FROM anon;