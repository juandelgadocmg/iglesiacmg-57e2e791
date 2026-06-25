
CREATE TABLE public.servicio_ministerios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id uuid NOT NULL REFERENCES public.servicios(id) ON DELETE CASCADE,
  ministerio_id uuid NOT NULL REFERENCES public.prog_ministerios(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (servicio_id, ministerio_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicio_ministerios TO authenticated;
GRANT ALL ON public.servicio_ministerios TO service_role;
ALTER TABLE public.servicio_ministerios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage servicio_ministerios" ON public.servicio_ministerios
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.servicio_programacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id uuid NOT NULL REFERENCES public.servicios(id) ON DELETE CASCADE,
  ministerio_id uuid NOT NULL REFERENCES public.prog_ministerios(id) ON DELETE CASCADE,
  cargo_id uuid REFERENCES public.prog_cargos(id) ON DELETE SET NULL,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (servicio_id, cargo_id, persona_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicio_programacion TO authenticated;
GRANT ALL ON public.servicio_programacion TO service_role;
ALTER TABLE public.servicio_programacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage servicio_programacion" ON public.servicio_programacion
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_servicio_programacion_updated_at
  BEFORE UPDATE ON public.servicio_programacion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_serv_min_servicio ON public.servicio_ministerios(servicio_id);
CREATE INDEX idx_serv_prog_servicio ON public.servicio_programacion(servicio_id);
CREATE INDEX idx_serv_prog_persona ON public.servicio_programacion(persona_id);
