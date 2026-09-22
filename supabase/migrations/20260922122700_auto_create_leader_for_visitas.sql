-- Ensure the leader exists when recording visits and activities
DROP TRIGGER IF EXISTS ensure_leader_exists_visitas ON public.discipulo_visitas;
CREATE TRIGGER ensure_leader_exists_visitas
BEFORE INSERT OR UPDATE ON public.discipulo_visitas
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_leader_if_missing();

DROP TRIGGER IF EXISTS ensure_leader_exists_actividades ON public.discipulo_actividades;
CREATE TRIGGER ensure_leader_exists_actividades
BEFORE INSERT OR UPDATE ON public.discipulo_actividades
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_leader_if_missing();
