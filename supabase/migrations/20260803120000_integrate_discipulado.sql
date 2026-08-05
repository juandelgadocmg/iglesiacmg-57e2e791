-- Database migration to integrate Discipulando Naciones tables into DOXA

-- 1) redes
CREATE TABLE IF NOT EXISTS public.redes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lider_red text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.redes ENABLE ROW LEVEL SECURITY;

-- 2) casas_de_paz
CREATE TABLE IF NOT EXISTS public.casas_de_paz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  red_id uuid REFERENCES public.redes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.casas_de_paz ENABLE ROW LEVEL SECURITY;

-- 3) leaders
CREATE TABLE IF NOT EXISTS public.leaders (
  id uuid PRIMARY KEY, -- references auth.users(id) historically, but we drop constraint just in case
  full_name text NOT NULL,
  phone text,
  email text,
  casa_de_paz_id uuid REFERENCES public.casas_de_paz(id) ON DELETE SET NULL,
  update_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leaders ENABLE ROW LEVEL SECURITY;

-- 4) discipulos
CREATE TABLE IF NOT EXISTS public.discipulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  casa_de_paz_id uuid REFERENCES public.casas_de_paz(id) ON DELETE SET NULL,
  lider_id uuid REFERENCES public.leaders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo', 'En pausa', 'Completado')),
  start_date date,
  notes text,
  last_update_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.discipulos ENABLE ROW LEVEL SECURITY;

-- 5) etapas_discipulado
CREATE TABLE IF NOT EXISTS public.etapas_discipulado (
  code text PRIMARY KEY,
  label text NOT NULL,
  order_num int NOT NULL
);
ALTER TABLE public.etapas_discipulado ENABLE ROW LEVEL SECURITY;

-- 6) progreso_discipulo
CREATE TABLE IF NOT EXISTS public.progreso_discipulo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipulo_id uuid NOT NULL REFERENCES public.discipulos(id) ON DELETE CASCADE,
  etapa_code text NOT NULL REFERENCES public.etapas_discipulado(code),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_by uuid REFERENCES public.leaders(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(discipulo_id, etapa_code)
);
ALTER TABLE public.progreso_discipulo ENABLE ROW LEVEL SECURITY;

-- 7) seguimientos
CREATE TABLE IF NOT EXISTS public.seguimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipulo_id uuid NOT NULL REFERENCES public.discipulos(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  resumen text NOT NULL,
  asistencia text,
  peticiones_oracion text,
  proximos_pasos text,
  created_by uuid REFERENCES public.leaders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seguimientos ENABLE ROW LEVEL SECURITY;

-- 8) metas_mensuales
CREATE TABLE IF NOT EXISTS public.metas_mensuales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key date NOT NULL,
  scope_type text NOT NULL CHECK (scope_type IN ('GLOBAL', 'LIDER', 'CASA', 'DISCIPULO')),
  lider_id uuid REFERENCES public.leaders(id) ON DELETE SET NULL,
  casa_de_paz_id uuid REFERENCES public.casas_de_paz(id) ON DELETE SET NULL,
  discipulo_id uuid REFERENCES public.discipulos(id) ON DELETE CASCADE,
  meta_seguimientos int NOT NULL DEFAULT 4,
  meta_etapas int NOT NULL DEFAULT 1,
  notes text,
  created_by uuid REFERENCES public.leaders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.metas_mensuales ENABLE ROW LEVEL SECURITY;

-- Triggers for auto-updating last_update_at
CREATE OR REPLACE FUNCTION public.update_discipulo_last_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.discipulos SET last_update_at = now() WHERE id = NEW.discipulo_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS seguimiento_update_discipulo ON public.seguimientos;
CREATE TRIGGER seguimiento_update_discipulo
AFTER INSERT ON public.seguimientos
FOR EACH ROW EXECUTE FUNCTION public.update_discipulo_last_update();

CREATE OR REPLACE FUNCTION public.update_discipulo_last_update_progreso()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.discipulos SET last_update_at = now() WHERE id = NEW.discipulo_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS progreso_update_discipulo ON public.progreso_discipulo;
CREATE TRIGGER progreso_update_discipulo
AFTER INSERT OR UPDATE ON public.progreso_discipulo
FOR EACH ROW EXECUTE FUNCTION public.update_discipulo_last_update_progreso();

-- Trigger function for updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_redes_updated_at ON public.redes;
CREATE TRIGGER update_redes_updated_at BEFORE UPDATE ON public.redes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_casas_updated_at ON public.casas_de_paz;
CREATE TRIGGER update_casas_updated_at BEFORE UPDATE ON public.casas_de_paz FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_leaders_updated_at ON public.leaders;
CREATE TRIGGER update_leaders_updated_at BEFORE UPDATE ON public.leaders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_discipulos_updated_at ON public.discipulos;
CREATE TRIGGER update_discipulos_updated_at BEFORE UPDATE ON public.discipulos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_progreso_updated_at ON public.progreso_discipulo;
CREATE TRIGGER update_progreso_updated_at BEFORE UPDATE ON public.progreso_discipulo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_metas_updated_at ON public.metas_mensuales;
CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON public.metas_mensuales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed etapas_discipulado values
INSERT INTO public.etapas_discipulado (code, label, order_num) VALUES
  ('NPT', 'Nací para triunfar', 1),
  ('TSDP', 'Tres semanas de poder', 2),
  ('NVNC', 'Nueva vida y nuevo comienzo', 3),
  ('RSI', 'Retiro de sanidad interior y liberación', 4),
  ('DNC', 'Discipulado de nuevo creyente', 5),
  ('ES', 'Escuela de evangelismo', 6),
  ('LCP', 'Líderes de casas de paz', 7),
  ('RLCP', 'Retiro de líderes de casas de paz', 8)
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, order_num = EXCLUDED.order_num;

-- RLS Policies (Adapted for lowercase roles in DOXA)

-- redes
CREATE POLICY "anon_select_redes" ON public.redes FOR SELECT USING (true);
CREATE POLICY "Admin manages redes" ON public.redes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));

-- casas_de_paz
CREATE POLICY "anon_select_casas" ON public.casas_de_paz FOR SELECT USING (true);
CREATE POLICY "Admin manages casas" ON public.casas_de_paz FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));

-- leaders
CREATE POLICY "anon_select_leaders" ON public.leaders FOR SELECT USING (true);
CREATE POLICY "Leaders insertable" ON public.leaders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor') OR auth.uid() = id);
CREATE POLICY "Leaders updatable" ON public.leaders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor') OR auth.uid() = id);
CREATE POLICY "Leaders deletable" ON public.leaders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));

-- discipulos
CREATE POLICY "anon_select_discipulos" ON public.discipulos FOR SELECT USING (true);
CREATE POLICY "Admin sees all discipulos" ON public.discipulos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Lider sees own discipulos" ON public.discipulos FOR SELECT TO authenticated USING (lider_id = auth.uid());
CREATE POLICY "Admin inserts discipulos" ON public.discipulos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Lider inserts own discipulos" ON public.discipulos FOR INSERT TO authenticated WITH CHECK (lider_id = auth.uid());
CREATE POLICY "Admin updates discipulos" ON public.discipulos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Lider updates own discipulos" ON public.discipulos FOR UPDATE TO authenticated USING (lider_id = auth.uid());
CREATE POLICY "Admin deletes discipulos" ON public.discipulos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));

-- etapas_discipulado
CREATE POLICY "anon_select_etapas" ON public.etapas_discipulado FOR SELECT USING (true);
CREATE POLICY "Etapas readable by all authenticated" ON public.etapas_discipulado FOR SELECT TO authenticated USING (true);

-- progreso_discipulo
CREATE POLICY "anon_select_progreso" ON public.progreso_discipulo FOR SELECT USING (true);
CREATE POLICY "Admin sees all progreso" ON public.progreso_discipulo FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Lider sees own progreso" ON public.progreso_discipulo FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));
CREATE POLICY "Admin manages progreso insert" ON public.progreso_discipulo FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Lider manages own progreso insert" ON public.progreso_discipulo FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));
CREATE POLICY "Admin manages progreso update" ON public.progreso_discipulo FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Lider manages own progreso update" ON public.progreso_discipulo FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));

-- seguimientos
CREATE POLICY "anon_select_seguimientos" ON public.seguimientos FOR SELECT USING (true);
CREATE POLICY "Admin sees all seguimientos" ON public.seguimientos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Lider sees own seguimientos" ON public.seguimientos FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));
CREATE POLICY "Admin inserts seguimientos" ON public.seguimientos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Lider inserts own seguimientos" ON public.seguimientos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));

-- metas_mensuales
CREATE POLICY "deny_all_metas" ON public.metas_mensuales FOR SELECT USING (false);
CREATE POLICY "Admin sees all metas" ON public.metas_mensuales FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Lider sees relevant metas" ON public.metas_mensuales FOR SELECT TO authenticated USING (scope_type = 'GLOBAL' OR lider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));
CREATE POLICY "Admin inserts metas" ON public.metas_mensuales FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Admin updates metas" ON public.metas_mensuales FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Lider inserts own metas" ON public.metas_mensuales FOR INSERT TO authenticated WITH CHECK (lider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));

-- Revokes on trigger functions for security
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_discipulo_last_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_discipulo_last_update_progreso() FROM PUBLIC, anon, authenticated;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.discipulos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.progreso_discipulo;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seguimientos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.metas_mensuales;
