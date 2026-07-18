DROP TRIGGER IF EXISTS audit_personas_ins_del ON public.personas;
CREATE TRIGGER audit_personas_ins_del
AFTER INSERT OR DELETE ON public.personas
FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();