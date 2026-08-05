
-- Role enum
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'LIDER');

-- User roles table (created first for has_role function)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1) leaders
CREATE TABLE public.leaders (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leaders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leaders readable by authenticated" ON public.leaders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leaders updatable by admin" ON public.leaders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Leaders insertable" ON public.leaders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN') OR auth.uid() = id);
CREATE TRIGGER update_leaders_updated_at BEFORE UPDATE ON public.leaders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) casas_de_paz
CREATE TABLE public.casas_de_paz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.casas_de_paz ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Casas readable by authenticated" ON public.casas_de_paz FOR SELECT TO authenticated USING (true);
CREATE POLICY "Casas insertable by admin" ON public.casas_de_paz FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Casas updatable by admin" ON public.casas_de_paz FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Casas deletable by admin" ON public.casas_de_paz FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE TRIGGER update_casas_updated_at BEFORE UPDATE ON public.casas_de_paz FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) discipulos
CREATE TABLE public.discipulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  casa_de_paz_id uuid REFERENCES public.casas_de_paz(id),
  lider_id uuid REFERENCES public.leaders(id),
  status text NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo', 'En pausa', 'Completado')),
  start_date date,
  notes text,
  last_update_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.discipulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin sees all discipulos" ON public.discipulos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Lider sees own discipulos" ON public.discipulos FOR SELECT TO authenticated USING (lider_id = auth.uid());
CREATE POLICY "Admin inserts discipulos" ON public.discipulos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Lider inserts own discipulos" ON public.discipulos FOR INSERT TO authenticated WITH CHECK (lider_id = auth.uid());
CREATE POLICY "Admin updates discipulos" ON public.discipulos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Lider updates own discipulos" ON public.discipulos FOR UPDATE TO authenticated USING (lider_id = auth.uid());
CREATE POLICY "Admin deletes discipulos" ON public.discipulos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE TRIGGER update_discipulos_updated_at BEFORE UPDATE ON public.discipulos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) etapas_discipulado (catálogo)
CREATE TABLE public.etapas_discipulado (
  code text PRIMARY KEY,
  label text NOT NULL,
  order_num int NOT NULL
);
ALTER TABLE public.etapas_discipulado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Etapas readable by all authenticated" ON public.etapas_discipulado FOR SELECT TO authenticated USING (true);

INSERT INTO public.etapas_discipulado (code, label, order_num) VALUES
  ('NPT', 'Nací para triunfar', 1),
  ('TSDP', 'Tres semanas de poder', 2),
  ('NVNC', 'Nueva vida y nuevo comienzo', 3),
  ('RSI', 'Retiro de sanidad interior y liberación', 4),
  ('DNC', 'Discipulado de nuevo creyente', 5),
  ('ES', 'Escuela de evangelismo', 6),
  ('LCP', 'Líderes de casas de paz', 7),
  ('RLCP', 'Retiro de líderes de casas de paz', 8);

-- 5) progreso_discipulo
CREATE TABLE public.progreso_discipulo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipulo_id uuid NOT NULL REFERENCES public.discipulos(id) ON DELETE CASCADE,
  etapa_code text NOT NULL REFERENCES public.etapas_discipulado(code),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_by uuid REFERENCES public.leaders(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(discipulo_id, etapa_code)
);
ALTER TABLE public.progreso_discipulo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin sees all progreso" ON public.progreso_discipulo FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Lider sees own progreso" ON public.progreso_discipulo FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));
CREATE POLICY "Admin manages progreso insert" ON public.progreso_discipulo FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Lider manages own progreso insert" ON public.progreso_discipulo FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));
CREATE POLICY "Admin manages progreso update" ON public.progreso_discipulo FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Lider manages own progreso update" ON public.progreso_discipulo FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));
CREATE TRIGGER update_progreso_updated_at BEFORE UPDATE ON public.progreso_discipulo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) seguimientos
CREATE TABLE public.seguimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipulo_id uuid NOT NULL REFERENCES public.discipulos(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  resumen text NOT NULL,
  asistencia text,
  peticiones_oracion text,
  proximos_pasos text,
  created_by uuid REFERENCES public.leaders(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seguimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin sees all seguimientos" ON public.seguimientos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Lider sees own seguimientos" ON public.seguimientos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));
CREATE POLICY "Admin inserts seguimientos" ON public.seguimientos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Lider inserts own seguimientos" ON public.seguimientos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));

-- 7) metas_mensuales
CREATE TABLE public.metas_mensuales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key date NOT NULL,
  scope_type text NOT NULL CHECK (scope_type IN ('GLOBAL', 'LIDER', 'CASA', 'DISCIPULO')),
  lider_id uuid REFERENCES public.leaders(id),
  casa_de_paz_id uuid REFERENCES public.casas_de_paz(id),
  discipulo_id uuid REFERENCES public.discipulos(id),
  meta_seguimientos int NOT NULL DEFAULT 4,
  meta_etapas int NOT NULL DEFAULT 1,
  notes text,
  created_by uuid REFERENCES public.leaders(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.metas_mensuales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin sees all metas" ON public.metas_mensuales FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Lider sees relevant metas" ON public.metas_mensuales FOR SELECT TO authenticated
  USING (scope_type = 'GLOBAL' OR lider_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));
CREATE POLICY "Admin inserts metas" ON public.metas_mensuales FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admin updates metas" ON public.metas_mensuales FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Lider inserts own metas" ON public.metas_mensuales FOR INSERT TO authenticated
  WITH CHECK (lider_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.discipulos d WHERE d.id = discipulo_id AND d.lider_id = auth.uid()));
CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON public.metas_mensuales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update last_update_at on seguimiento insert
CREATE OR REPLACE FUNCTION public.update_discipulo_last_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.discipulos SET last_update_at = now() WHERE id = NEW.discipulo_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER seguimiento_update_discipulo
AFTER INSERT ON public.seguimientos
FOR EACH ROW EXECUTE FUNCTION public.update_discipulo_last_update();

-- Trigger: update last_update_at on progreso change
CREATE OR REPLACE FUNCTION public.update_discipulo_last_update_progreso()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.discipulos SET last_update_at = now() WHERE id = NEW.discipulo_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER progreso_update_discipulo
AFTER INSERT OR UPDATE ON public.progreso_discipulo
FOR EACH ROW EXECUTE FUNCTION public.update_discipulo_last_update_progreso();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.discipulos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.progreso_discipulo;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seguimientos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.metas_mensuales;
