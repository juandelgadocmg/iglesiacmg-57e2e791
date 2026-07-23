DROP TRIGGER IF EXISTS trg_audit_prog_iso_templates ON public.prog_iso_templates;
CREATE TRIGGER trg_audit_prog_iso_templates
AFTER INSERT OR UPDATE OR DELETE ON public.prog_iso_templates
FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();