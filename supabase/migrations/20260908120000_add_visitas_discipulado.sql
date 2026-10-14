-- Migration to add visitas and actividades to the Discipulado module

-- 1. Add telefono to discipulos
ALTER TABLE public.discipulos ADD COLUMN IF NOT EXISTS telefono text;

-- 2. Create discipulo_visitas
CREATE TABLE IF NOT EXISTS public.discipulo_visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipulo_id uuid NOT NULL REFERENCES public.discipulos(id) ON DELETE CASCADE,
  lider_id uuid NOT NULL REFERENCES public.leaders(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora time,
  lugar text NOT NULL,
  direccion text,
  realizada boolean NOT NULL DEFAULT true,
  ungio_casa text NOT NULL DEFAULT 'No aplica' CHECK (ungio_casa IN ('Sí', 'No', 'No aplica')),
  oro boolean NOT NULL DEFAULT false,
  enseno boolean NOT NULL DEFAULT false,
  observaciones text,
  proximo_seguimiento date,
  compromiso text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discipulo_visitas ENABLE ROW LEVEL SECURITY;

-- 3. Create discipulo_actividades (History log)
CREATE TABLE IF NOT EXISTS public.discipulo_actividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipulo_id uuid NOT NULL REFERENCES public.discipulos(id) ON DELETE CASCADE,
  lider_id uuid NOT NULL REFERENCES public.leaders(id) ON DELETE CASCADE,
  tipo_actividad text NOT NULL, -- e.g. 'Visita', 'Llamada', 'Mensaje'
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora time,
  descripcion text NOT NULL,
  referencia_id uuid, -- For example, the ID of the visit
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discipulo_actividades ENABLE ROW LEVEL SECURITY;

-- 4. Triggers for updated_at
DROP TRIGGER IF EXISTS update_discipulo_visitas_updated_at ON public.discipulo_visitas;
CREATE TRIGGER update_discipulo_visitas_updated_at 
BEFORE UPDATE ON public.discipulo_visitas 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Trigger to auto-create an actividad when a visita is created
CREATE OR REPLACE FUNCTION public.log_visita_as_actividad()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.discipulo_actividades (
    discipulo_id, lider_id, tipo_actividad, fecha, hora, descripcion, referencia_id
  ) VALUES (
    NEW.discipulo_id, NEW.lider_id, 'Visita', NEW.fecha, NEW.hora,
    'Visita ' || LOWER(NEW.lugar) || CASE WHEN NEW.realizada THEN ' realizada' ELSE ' no realizada' END,
    NEW.id
  );
  
  -- Update the last_update_at on discipulo
  UPDATE public.discipulos SET last_update_at = now() WHERE id = NEW.discipulo_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_log_visita_as_actividad ON public.discipulo_visitas;
CREATE TRIGGER trigger_log_visita_as_actividad
AFTER INSERT ON public.discipulo_visitas
FOR EACH ROW EXECUTE FUNCTION public.log_visita_as_actividad();

-- 6. RLS Policies

-- discipulo_visitas
CREATE POLICY "Líder ve sus propias visitas" ON public.discipulo_visitas FOR SELECT TO authenticated USING (lider_id = auth.uid());
CREATE POLICY "Admin ve todas las visitas" ON public.discipulo_visitas FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Líder inserta sus visitas" ON public.discipulo_visitas FOR INSERT TO authenticated WITH CHECK (lider_id = auth.uid());
CREATE POLICY "Admin inserta visitas" ON public.discipulo_visitas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Líder actualiza sus visitas" ON public.discipulo_visitas FOR UPDATE TO authenticated USING (lider_id = auth.uid());
CREATE POLICY "Admin actualiza visitas" ON public.discipulo_visitas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));

-- discipulo_actividades
CREATE POLICY "Líder ve actividades de sus discípulos" ON public.discipulo_actividades FOR SELECT TO authenticated USING (lider_id = auth.uid());
CREATE POLICY "Admin ve todas las actividades" ON public.discipulo_actividades FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));
CREATE POLICY "Líder inserta actividades" ON public.discipulo_actividades FOR INSERT TO authenticated WITH CHECK (lider_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.discipulo_visitas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discipulo_actividades;
