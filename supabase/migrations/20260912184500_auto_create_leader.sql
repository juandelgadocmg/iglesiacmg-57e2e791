-- Migration to auto-create leader if missing on discipulo insert
CREATE OR REPLACE FUNCTION public.auto_create_leader_if_missing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lider_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.leaders WHERE id = NEW.lider_id) THEN
      -- Try to create the leader with basic info
      -- We don't have the email or name, so we use defaults
      INSERT INTO public.leaders (id, full_name, email)
      VALUES (NEW.lider_id, 'Líder Autogenerado', (SELECT email FROM auth.users WHERE id = NEW.lider_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_leader_exists ON public.discipulos;
CREATE TRIGGER ensure_leader_exists
BEFORE INSERT OR UPDATE ON public.discipulos
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_leader_if_missing();
