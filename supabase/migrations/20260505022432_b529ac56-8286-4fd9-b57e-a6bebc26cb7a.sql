-- Tabla: consejeros_horarios (disponibilidad)
CREATE TABLE public.consejeros_horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consejero_persona_id UUID NOT NULL,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL CHECK (hora_fin > hora_inicio),
  duracion_minutos INTEGER NOT NULL DEFAULT 60 CHECK (duracion_minutos > 0),
  modalidad TEXT NOT NULL DEFAULT 'ambas' CHECK (modalidad IN ('presencial','virtual','ambas')),
  lugar TEXT,
  enlace_virtual TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_horarios_consejero ON public.consejeros_horarios(consejero_persona_id);

ALTER TABLE public.consejeros_horarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura horarios autenticados" ON public.consejeros_horarios
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/Pastor gestiona horarios" ON public.consejeros_horarios
FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor'));

-- Tabla: citas_consejeria
CREATE TABLE public.citas_consejeria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_persona_id UUID,
  solicitante_user_id UUID,
  solicitante_nombre TEXT NOT NULL,
  solicitante_email TEXT,
  solicitante_telefono TEXT,
  consejero_persona_id UUID NOT NULL,
  consejero_nombre TEXT,
  consejero_email TEXT,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  modalidad TEXT NOT NULL CHECK (modalidad IN ('presencial','virtual')),
  lugar TEXT,
  enlace_virtual TEXT,
  motivo_categoria TEXT NOT NULL DEFAULT 'otro' CHECK (motivo_categoria IN ('espiritual','familiar','emocional','liderazgo','matrimonial','otro')),
  motivo_descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmada','completada','cancelada','no_asistio')),
  requiere_intercesion BOOLEAN NOT NULL DEFAULT false,
  requiere_consolidacion BOOLEAN NOT NULL DEFAULT false,
  notas_admin TEXT,
  motivo_cancelacion TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_citas_consejero_fecha ON public.citas_consejeria(consejero_persona_id, fecha);
CREATE INDEX idx_citas_user ON public.citas_consejeria(solicitante_user_id);
CREATE INDEX idx_citas_persona ON public.citas_consejeria(solicitante_persona_id);

-- Único parcial: evita doble reserva (excepto canceladas)
CREATE UNIQUE INDEX uq_cita_slot_activa
ON public.citas_consejeria(consejero_persona_id, fecha, hora_inicio)
WHERE estado <> 'cancelada';

ALTER TABLE public.citas_consejeria ENABLE ROW LEVEL SECURITY;

-- Admin/pastor/secretaria: full access
CREATE POLICY "Staff gestiona citas" ON public.citas_consejeria
FOR ALL TO authenticated
USING (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
  OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'secretaria')
)
WITH CHECK (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
  OR has_role(auth.uid(),'pastor') OR has_role(auth.uid(),'secretaria')
);

-- Usuario ve solo sus propias citas
CREATE POLICY "Usuario ve sus citas" ON public.citas_consejeria
FOR SELECT TO authenticated
USING (solicitante_user_id = auth.uid());

-- Usuario crea cita para sí mismo
CREATE POLICY "Usuario crea su cita" ON public.citas_consejeria
FOR INSERT TO authenticated
WITH CHECK (solicitante_user_id = auth.uid());

-- Usuario puede cancelar (update) su propia cita
CREATE POLICY "Usuario actualiza su cita" ON public.citas_consejeria
FOR UPDATE TO authenticated
USING (solicitante_user_id = auth.uid())
WITH CHECK (solicitante_user_id = auth.uid());

-- Tabla: observaciones_consejeria
CREATE TABLE public.observaciones_consejeria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id UUID NOT NULL REFERENCES public.citas_consejeria(id) ON DELETE CASCADE,
  notas TEXT,
  estado_caso TEXT NOT NULL DEFAULT 'en_proceso' CHECK (estado_caso IN ('en_proceso','cerrado','seguimiento')),
  proxima_accion TEXT,
  fecha_seguimiento DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_obs_cita ON public.observaciones_consejeria(cita_id);

ALTER TABLE public.observaciones_consejeria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Pastor gestiona observaciones" ON public.observaciones_consejeria
FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'pastor'));

-- Triggers de updated_at
CREATE TRIGGER trg_horarios_updated BEFORE UPDATE ON public.consejeros_horarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_citas_updated BEFORE UPDATE ON public.citas_consejeria
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_obs_updated BEFORE UPDATE ON public.observaciones_consejeria
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: si requiere intercesión, crear petición de oración
CREATE OR REPLACE FUNCTION public.cita_consejeria_intercesion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.requiere_intercesion = true AND (TG_OP = 'INSERT' OR OLD.requiere_intercesion IS DISTINCT FROM NEW.requiere_intercesion) THEN
    INSERT INTO public.peticiones_oracion (titulo, descripcion, persona_id, tipo, prioridad, estado)
    VALUES (
      'Intercesión por consejería - ' || NEW.solicitante_nombre,
      COALESCE(NEW.motivo_descripcion, 'Solicitud generada desde cita de consejería ('|| NEW.motivo_categoria ||')'),
      NEW.solicitante_persona_id,
      'Consejería',
      'Alta',
      'Pendiente'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cita_intercesion
AFTER INSERT OR UPDATE ON public.citas_consejeria
FOR EACH ROW EXECUTE FUNCTION public.cita_consejeria_intercesion();