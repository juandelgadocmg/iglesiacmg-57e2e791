
-- ===== PROGRAMACIÓN DE SERVIDORES (Reuniones) =====

-- 1) Ministerios
CREATE TABLE public.prog_ministerios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  descripcion text,
  color text DEFAULT '#2563eb',
  icono text,
  lider_persona_id uuid REFERENCES public.personas(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prog_ministerios TO authenticated;
GRANT ALL ON public.prog_ministerios TO service_role;
ALTER TABLE public.prog_ministerios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prog_ministerios read" ON public.prog_ministerios FOR SELECT TO authenticated USING (true);
CREATE POLICY "prog_ministerios write staff" ON public.prog_ministerios FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider') OR has_role(auth.uid(),'lider_red'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider') OR has_role(auth.uid(),'lider_red'));

-- 2) Cargos por ministerio
CREATE TABLE public.prog_cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id uuid NOT NULL REFERENCES public.prog_ministerios(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden int NOT NULL DEFAULT 0,
  cupo int NOT NULL DEFAULT 1,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministerio_id, nombre)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prog_cargos TO authenticated;
GRANT ALL ON public.prog_cargos TO service_role;
ALTER TABLE public.prog_cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prog_cargos read" ON public.prog_cargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "prog_cargos write staff" ON public.prog_cargos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider') OR has_role(auth.uid(),'lider_red'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider') OR has_role(auth.uid(),'lider_red'));

-- 3) Servidores
CREATE TABLE public.prog_servidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id uuid NOT NULL REFERENCES public.prog_ministerios(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  cargo_id uuid REFERENCES public.prog_cargos(id) ON DELETE SET NULL,
  es_lider boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministerio_id, persona_id, cargo_id)
);
CREATE INDEX prog_servidores_persona_idx ON public.prog_servidores(persona_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prog_servidores TO authenticated;
GRANT ALL ON public.prog_servidores TO service_role;
ALTER TABLE public.prog_servidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prog_servidores read" ON public.prog_servidores FOR SELECT TO authenticated USING (true);
CREATE POLICY "prog_servidores write staff" ON public.prog_servidores FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider_red'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider_red'));

-- 4) Eventos programables (servicios y eventos especiales)
CREATE TABLE public.prog_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'servicio',
  fecha date NOT NULL,
  hora text,
  lugar text,
  descripcion text,
  servicio_id uuid REFERENCES public.servicios(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'borrador',
  publicado_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prog_eventos_fecha_idx ON public.prog_eventos(fecha);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prog_eventos TO authenticated;
GRANT ALL ON public.prog_eventos TO service_role;
ALTER TABLE public.prog_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prog_eventos read" ON public.prog_eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "prog_eventos write staff" ON public.prog_eventos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider') OR has_role(auth.uid(),'lider_red'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider') OR has_role(auth.uid(),'lider_red'));

-- 5) Asignaciones
CREATE TABLE public.prog_asignaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.prog_eventos(id) ON DELETE CASCADE,
  ministerio_id uuid NOT NULL REFERENCES public.prog_ministerios(id) ON DELETE CASCADE,
  cargo_id uuid REFERENCES public.prog_cargos(id) ON DELETE SET NULL,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  estado text NOT NULL DEFAULT 'pendiente',
  asistencia text,
  notas text,
  confirmado_at timestamptz,
  asistencia_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, ministerio_id, cargo_id, persona_id)
);
CREATE INDEX prog_asignaciones_evento_idx ON public.prog_asignaciones(evento_id);
CREATE INDEX prog_asignaciones_persona_idx ON public.prog_asignaciones(persona_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prog_asignaciones TO authenticated;
GRANT ALL ON public.prog_asignaciones TO service_role;
ALTER TABLE public.prog_asignaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prog_asign read" ON public.prog_asignaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "prog_asign write staff" ON public.prog_asignaciones FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider') OR has_role(auth.uid(),'lider_red'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider') OR has_role(auth.uid(),'lider_red'));

-- 6) Disponibilidad / Ausencias
CREATE TABLE public.prog_disponibilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  motivo text NOT NULL DEFAULT 'no_disponible',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prog_disp_persona_idx ON public.prog_disponibilidad(persona_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prog_disponibilidad TO authenticated;
GRANT ALL ON public.prog_disponibilidad TO service_role;
ALTER TABLE public.prog_disponibilidad ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prog_disp read" ON public.prog_disponibilidad FOR SELECT TO authenticated USING (true);
CREATE POLICY "prog_disp write staff" ON public.prog_disponibilidad FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider_red'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'lider_red'));

-- updated_at triggers
CREATE TRIGGER prog_ministerios_uat BEFORE UPDATE ON public.prog_ministerios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER prog_eventos_uat BEFORE UPDATE ON public.prog_eventos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER prog_asign_uat BEFORE UPDATE ON public.prog_asignaciones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== SEED MINISTERIOS Y CARGOS ======
INSERT INTO public.prog_ministerios (nombre, color) VALUES
  ('Alabanza','#7c3aed'),
  ('Danza','#ec4899'),
  ('Protocolo y Seguridad','#0ea5e9'),
  ('Diaconado','#16a34a'),
  ('Infantil','#f59e0b'),
  ('Intercesión','#dc2626'),
  ('Comunicaciones','#2563eb'),
  ('Kings Army','#1e293b'),
  ('Consolidación','#0d9488'),
  ('Sonido','#475569')
ON CONFLICT (nombre) DO NOTHING;

-- Cargos
WITH m AS (SELECT id, nombre FROM public.prog_ministerios)
INSERT INTO public.prog_cargos (ministerio_id, nombre, orden) 
SELECT m.id, c.cargo, c.ord FROM m JOIN (VALUES
  ('Alabanza','Director',1),('Alabanza','Cantante',2),('Alabanza','Teclado',3),('Alabanza','Batería',4),('Alabanza','Bajo',5),('Alabanza','Guitarra',6),('Alabanza','Coros',7),
  ('Protocolo y Seguridad','Líder',1),('Protocolo y Seguridad','Servidor',2),
  ('Comunicaciones','Director',1),('Comunicaciones','Fotografía',2),('Comunicaciones','Video',3),('Comunicaciones','Streaming',4),('Comunicaciones','Cámara 1',5),('Comunicaciones','Cámara 2',6),
  ('Danza','Líder',1),('Danza','Bailarín',2),
  ('Diaconado','Líder',1),('Diaconado','Diácono',2),
  ('Infantil','Líder',1),('Infantil','Maestro',2),('Infantil','Apoyo',3),
  ('Intercesión','Líder',1),('Intercesión','Intercesor',2),
  ('Kings Army','Líder',1),('Kings Army','Servidor',2),
  ('Consolidación','Líder',1),('Consolidación','Consolidador',2),
  ('Sonido','Líder',1),('Sonido','Operador FOH',2),('Sonido','Operador Monitores',3)
) AS c(min, cargo, ord) ON m.nombre = c.min
ON CONFLICT DO NOTHING;
