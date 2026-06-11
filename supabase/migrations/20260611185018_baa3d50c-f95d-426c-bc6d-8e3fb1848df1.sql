
-- Helpers
CREATE OR REPLACE FUNCTION public.sem_is_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT has_role(_uid,'admin') OR has_role(_uid,'super_admin')
      OR has_role(_uid,'pastor') OR has_role(_uid,'seminario_admin')
$$;
REVOKE EXECUTE ON FUNCTION public.sem_is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sem_is_staff(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sem_is_tesoreria(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT has_role(_uid,'tesoreria') OR public.sem_is_staff(_uid)
$$;
REVOKE EXECUTE ON FUNCTION public.sem_is_tesoreria(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sem_is_tesoreria(uuid) TO authenticated, service_role;

-- 1. PROGRAMAS
CREATE TABLE public.sem_programas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  total_semestres integer NOT NULL DEFAULT 8,
  total_creditos integer DEFAULT 0,
  duracion_anios numeric(3,1),
  modalidad text DEFAULT 'mixta',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sem_programas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sem_programas TO authenticated;
GRANT ALL ON public.sem_programas TO service_role;
ALTER TABLE public.sem_programas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect publica programas" ON public.sem_programas FOR SELECT USING (true);
CREATE POLICY "escrit staff programas" ON public.sem_programas FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 2. SEMESTRES
CREATE TABLE public.sem_pensum_semestres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id uuid NOT NULL REFERENCES public.sem_programas(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  nombre text NOT NULL,
  creditos_totales integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programa_id, numero)
);
GRANT SELECT ON public.sem_pensum_semestres TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sem_pensum_semestres TO authenticated;
GRANT ALL ON public.sem_pensum_semestres TO service_role;
ALTER TABLE public.sem_pensum_semestres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect semestres" ON public.sem_pensum_semestres FOR SELECT USING (true);
CREATE POLICY "escrit staff semestres" ON public.sem_pensum_semestres FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 3. MATERIAS
CREATE TABLE public.sem_materias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id uuid NOT NULL REFERENCES public.sem_programas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  creditos integer NOT NULL DEFAULT 3,
  intensidad_horaria integer DEFAULT 48,
  area text,
  color text DEFAULT '#3B82F6',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programa_id, codigo)
);
GRANT SELECT ON public.sem_materias TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sem_materias TO authenticated;
GRANT ALL ON public.sem_materias TO service_role;
ALTER TABLE public.sem_materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect materias" ON public.sem_materias FOR SELECT USING (true);
CREATE POLICY "escrit staff materias" ON public.sem_materias FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 4. PRERREQUISITOS
CREATE TABLE public.sem_materia_prerequisitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id uuid NOT NULL REFERENCES public.sem_materias(id) ON DELETE CASCADE,
  prerequisito_id uuid NOT NULL REFERENCES public.sem_materias(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (materia_id, prerequisito_id),
  CHECK (materia_id <> prerequisito_id)
);
GRANT SELECT ON public.sem_materia_prerequisitos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sem_materia_prerequisitos TO authenticated;
GRANT ALL ON public.sem_materia_prerequisitos TO service_role;
ALTER TABLE public.sem_materia_prerequisitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect prereq" ON public.sem_materia_prerequisitos FOR SELECT USING (true);
CREATE POLICY "escrit staff prereq" ON public.sem_materia_prerequisitos FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 5. PENSUM-MATERIAS
CREATE TABLE public.sem_pensum_materias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semestre_id uuid NOT NULL REFERENCES public.sem_pensum_semestres(id) ON DELETE CASCADE,
  materia_id uuid NOT NULL REFERENCES public.sem_materias(id) ON DELETE CASCADE,
  orden integer DEFAULT 0,
  obligatoria boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (semestre_id, materia_id)
);
GRANT SELECT ON public.sem_pensum_materias TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sem_pensum_materias TO authenticated;
GRANT ALL ON public.sem_pensum_materias TO service_role;
ALTER TABLE public.sem_pensum_materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect pensum-mat" ON public.sem_pensum_materias FOR SELECT USING (true);
CREATE POLICY "escrit staff pensum-mat" ON public.sem_pensum_materias FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 6. PERIODOS
CREATE TABLE public.sem_periodos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id uuid REFERENCES public.sem_programas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nombre text NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  fecha_inicio_inscripcion date,
  fecha_fin_inscripcion date,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programa_id, codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_periodos TO authenticated;
GRANT ALL ON public.sem_periodos TO service_role;
ALTER TABLE public.sem_periodos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect periodos" ON public.sem_periodos FOR SELECT TO authenticated USING (true);
CREATE POLICY "escrit staff periodos" ON public.sem_periodos FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 7. OFERTAS
CREATE TABLE public.sem_ofertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id uuid NOT NULL REFERENCES public.sem_periodos(id) ON DELETE CASCADE,
  materia_id uuid NOT NULL REFERENCES public.sem_materias(id) ON DELETE RESTRICT,
  docente_persona_id uuid REFERENCES public.personas(id) ON DELETE SET NULL,
  docente_nombre text,
  aula text,
  horario text,
  cupos integer,
  modalidad text DEFAULT 'presencial',
  zoom_link text,
  zoom_meeting_id text,
  zoom_password text,
  estado text NOT NULL DEFAULT 'abierta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (periodo_id, materia_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_ofertas TO authenticated;
GRANT ALL ON public.sem_ofertas TO service_role;
ALTER TABLE public.sem_ofertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect ofertas" ON public.sem_ofertas FOR SELECT TO authenticated USING (true);
CREATE POLICY "escrit staff ofertas" ON public.sem_ofertas FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 8. INSCRIPCIONES
CREATE TABLE public.sem_inscripciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  user_id uuid,
  programa_id uuid NOT NULL REFERENCES public.sem_programas(id),
  periodo_id uuid NOT NULL REFERENCES public.sem_periodos(id),
  semestre_actual integer DEFAULT 1,
  estado text NOT NULL DEFAULT 'borrador',
  promedio_acumulado numeric(4,2) DEFAULT 0,
  total_creditos_aprobados integer DEFAULT 0,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (persona_id, periodo_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_inscripciones TO authenticated;
GRANT ALL ON public.sem_inscripciones TO service_role;
ALTER TABLE public.sem_inscripciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect inscripciones" ON public.sem_inscripciones FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.sem_is_tesoreria(auth.uid()));
CREATE POLICY "escrit staff inscripciones" ON public.sem_inscripciones FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 9. INSCRIPCION-MATERIAS
CREATE TABLE public.sem_inscripcion_materias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscripcion_id uuid NOT NULL REFERENCES public.sem_inscripciones(id) ON DELETE CASCADE,
  oferta_id uuid NOT NULL REFERENCES public.sem_ofertas(id),
  materia_id uuid NOT NULL REFERENCES public.sem_materias(id),
  nota_final numeric(4,2),
  estado text NOT NULL DEFAULT 'cursando',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inscripcion_id, oferta_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_inscripcion_materias TO authenticated;
GRANT ALL ON public.sem_inscripcion_materias TO service_role;
ALTER TABLE public.sem_inscripcion_materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect cursadas" ON public.sem_inscripcion_materias FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sem_inscripciones i
    WHERE i.id = inscripcion_id AND (i.user_id = auth.uid() OR public.sem_is_tesoreria(auth.uid()))));
CREATE POLICY "escrit staff cursadas" ON public.sem_inscripcion_materias FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 10. EVALUACIONES
CREATE TABLE public.sem_evaluaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL REFERENCES public.sem_ofertas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  tipo text NOT NULL DEFAULT 'parcial',
  peso numeric(5,2) NOT NULL DEFAULT 0,
  fecha date,
  publicada boolean NOT NULL DEFAULT false,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_evaluaciones TO authenticated;
GRANT ALL ON public.sem_evaluaciones TO service_role;
ALTER TABLE public.sem_evaluaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect eval" ON public.sem_evaluaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "escrit staff eval" ON public.sem_evaluaciones FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 11. CALIFICACIONES
CREATE TABLE public.sem_calificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscripcion_materia_id uuid NOT NULL REFERENCES public.sem_inscripcion_materias(id) ON DELETE CASCADE,
  evaluacion_id uuid NOT NULL REFERENCES public.sem_evaluaciones(id) ON DELETE CASCADE,
  nota numeric(4,2) NOT NULL,
  observacion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inscripcion_materia_id, evaluacion_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_calificaciones TO authenticated;
GRANT ALL ON public.sem_calificaciones TO service_role;
ALTER TABLE public.sem_calificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect notas" ON public.sem_calificaciones FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sem_inscripcion_materias im
    JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
    WHERE im.id = inscripcion_materia_id AND (i.user_id = auth.uid() OR public.sem_is_staff(auth.uid()))));
CREATE POLICY "escrit staff notas" ON public.sem_calificaciones FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 12. ASISTENCIAS
CREATE TABLE public.sem_asistencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscripcion_materia_id uuid NOT NULL REFERENCES public.sem_inscripcion_materias(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  estado text NOT NULL DEFAULT 'presente',
  observacion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inscripcion_materia_id, fecha)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_asistencias TO authenticated;
GRANT ALL ON public.sem_asistencias TO service_role;
ALTER TABLE public.sem_asistencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect asist" ON public.sem_asistencias FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sem_inscripcion_materias im
    JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
    WHERE im.id = inscripcion_materia_id AND (i.user_id = auth.uid() OR public.sem_is_staff(auth.uid()))));
CREATE POLICY "escrit staff asist" ON public.sem_asistencias FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 13. RECURSOS
CREATE TABLE public.sem_recursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id uuid REFERENCES public.sem_programas(id) ON DELETE CASCADE,
  materia_id uuid REFERENCES public.sem_materias(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  tipo text NOT NULL DEFAULT 'pdf',
  url text,
  storage_path text,
  autor text,
  publicado boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_recursos TO authenticated;
GRANT ALL ON public.sem_recursos TO service_role;
ALTER TABLE public.sem_recursos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect recursos" ON public.sem_recursos FOR SELECT TO authenticated
  USING (publicado OR public.sem_is_staff(auth.uid()));
CREATE POLICY "escrit staff recursos" ON public.sem_recursos FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 14. ZOOM
CREATE TABLE public.sem_zoom_sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL REFERENCES public.sem_ofertas(id) ON DELETE CASCADE,
  meeting_id text NOT NULL,
  join_url text NOT NULL,
  start_url text,
  password text,
  topic text,
  start_time timestamptz,
  duration_minutes integer DEFAULT 90,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_zoom_sesiones TO authenticated;
GRANT ALL ON public.sem_zoom_sesiones TO service_role;
ALTER TABLE public.sem_zoom_sesiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect zoom" ON public.sem_zoom_sesiones FOR SELECT TO authenticated USING (true);
CREATE POLICY "escrit staff zoom" ON public.sem_zoom_sesiones FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid())) WITH CHECK (public.sem_is_staff(auth.uid()));

-- 15. PAGOS
CREATE TABLE public.sem_pagos_inscripcion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscripcion_id uuid NOT NULL REFERENCES public.sem_inscripciones(id) ON DELETE CASCADE,
  concepto text NOT NULL,
  valor numeric(12,2) NOT NULL,
  valor_pagado numeric(12,2) DEFAULT 0,
  fecha_vencimiento date,
  fecha_pago date,
  estado text NOT NULL DEFAULT 'pendiente',
  metodo_pago text,
  comprobante_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_pagos_inscripcion TO authenticated;
GRANT ALL ON public.sem_pagos_inscripcion TO service_role;
ALTER TABLE public.sem_pagos_inscripcion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect pagos" ON public.sem_pagos_inscripcion FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sem_inscripciones i
    WHERE i.id = inscripcion_id AND (i.user_id = auth.uid() OR public.sem_is_tesoreria(auth.uid()))));
CREATE POLICY "escrit tesoreria pagos" ON public.sem_pagos_inscripcion FOR ALL TO authenticated
  USING (public.sem_is_tesoreria(auth.uid())) WITH CHECK (public.sem_is_tesoreria(auth.uid()));

-- FUNCIONES NEGOCIO
CREATE OR REPLACE FUNCTION public.sem_estudiante_tiene_mora(_persona_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sem_pagos_inscripcion p
    JOIN public.sem_inscripciones i ON i.id = p.inscripcion_id
    WHERE i.persona_id = _persona_id
      AND p.estado <> 'pagado'
      AND p.fecha_vencimiento IS NOT NULL
      AND p.fecha_vencimiento < (CURRENT_DATE - INTERVAL '30 days')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.sem_estudiante_tiene_mora(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sem_estudiante_tiene_mora(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sem_calcular_promedio(_persona_id uuid, _programa_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(ROUND(SUM(im.nota_final * m.creditos)::numeric / NULLIF(SUM(m.creditos),0), 2), 0)
  FROM public.sem_inscripcion_materias im
  JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
  JOIN public.sem_materias m ON m.id = im.materia_id
  WHERE i.persona_id = _persona_id
    AND i.programa_id = _programa_id
    AND im.nota_final IS NOT NULL
    AND im.estado IN ('aprobada','reprobada')
$$;
REVOKE EXECUTE ON FUNCTION public.sem_calcular_promedio(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sem_calcular_promedio(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sem_puede_inscribir(_persona_id uuid, _materia_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.sem_materia_prerequisitos pr
    WHERE pr.materia_id = _materia_id
      AND NOT EXISTS (
        SELECT 1 FROM public.sem_inscripcion_materias im
        JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
        WHERE i.persona_id = _persona_id
          AND im.materia_id = pr.prerequisito_id
          AND im.estado = 'aprobada'
          AND COALESCE(im.nota_final,0) >= 3.0
      )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.sem_puede_inscribir(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sem_puede_inscribir(uuid,uuid) TO authenticated, service_role;

-- TRIGGERS updated_at
CREATE TRIGGER trg_sem_programas_upd BEFORE UPDATE ON public.sem_programas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sem_pensum_sem_upd BEFORE UPDATE ON public.sem_pensum_semestres FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sem_materias_upd BEFORE UPDATE ON public.sem_materias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sem_periodos_upd BEFORE UPDATE ON public.sem_periodos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sem_ofertas_upd BEFORE UPDATE ON public.sem_ofertas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sem_insc_upd BEFORE UPDATE ON public.sem_inscripciones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sem_insc_mat_upd BEFORE UPDATE ON public.sem_inscripcion_materias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sem_eval_upd BEFORE UPDATE ON public.sem_evaluaciones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sem_calif_upd BEFORE UPDATE ON public.sem_calificaciones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sem_recursos_upd BEFORE UPDATE ON public.sem_recursos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sem_pagos_upd BEFORE UPDATE ON public.sem_pagos_inscripcion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED
INSERT INTO public.sem_programas (codigo, nombre, descripcion, total_semestres, duracion_anios, modalidad)
VALUES ('TBM','Teología Bíblica y Ministerial',
  'Programa de formación teológica y ministerial integral con duración de 4 años (8 semestres).',
  8, 4.0, 'mixta')
ON CONFLICT (codigo) DO NOTHING;

DO $$
DECLARE prog_id uuid;
BEGIN
  SELECT id INTO prog_id FROM public.sem_programas WHERE codigo = 'TBM';
  IF prog_id IS NOT NULL THEN
    FOR i IN 1..8 LOOP
      INSERT INTO public.sem_pensum_semestres (programa_id, numero, nombre)
      VALUES (prog_id, i, 'Semestre ' || i)
      ON CONFLICT (programa_id, numero) DO NOTHING;
    END LOOP;
  END IF;
END $$;
