
-- Alertas Importantes: bandeja con severidad y estados
CREATE TABLE public.alertas_importantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  severidad TEXT NOT NULL DEFAULT 'media' CHECK (severidad IN ('baja','media','alta','critica')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','leida','resuelta','archivada')),
  categoria TEXT,
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  grupo_id UUID REFERENCES public.grupos(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_by_email TEXT,
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas_importantes TO authenticated;
GRANT ALL ON public.alertas_importantes TO service_role;
ALTER TABLE public.alertas_importantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas admin/pastor read" ON public.alertas_importantes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'pastor') OR created_by = auth.uid());
CREATE POLICY "alertas insert authenticated" ON public.alertas_importantes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "alertas update admin/pastor/owner" ON public.alertas_importantes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'pastor') OR created_by = auth.uid());
CREATE POLICY "alertas delete admin" ON public.alertas_importantes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_alertas_updated_at BEFORE UPDATE ON public.alertas_importantes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_alertas_estado ON public.alertas_importantes(estado, severidad, created_at DESC);

-- Recordatorios de cumpleaños del equipo
CREATE TABLE public.cumple_recordatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  nota TEXT,
  recordar_dias_antes INTEGER NOT NULL DEFAULT 3 CHECK (recordar_dias_antes BETWEEN 0 AND 30),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(persona_id, created_by)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cumple_recordatorios TO authenticated;
GRANT ALL ON public.cumple_recordatorios TO service_role;
ALTER TABLE public.cumple_recordatorios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cumple read auth" ON public.cumple_recordatorios FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "cumple insert own" ON public.cumple_recordatorios FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "cumple update own/admin" ON public.cumple_recordatorios FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "cumple delete own/admin" ON public.cumple_recordatorios FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_cumple_updated_at BEFORE UPDATE ON public.cumple_recordatorios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
