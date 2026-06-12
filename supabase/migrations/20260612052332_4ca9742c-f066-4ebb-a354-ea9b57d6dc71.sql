
-- ─────── sem_anuncios ───────
CREATE TABLE IF NOT EXISTS public.sem_anuncios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL REFERENCES public.sem_ofertas(id) ON DELETE CASCADE,
  autor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_anuncios TO authenticated;
GRANT ALL ON public.sem_anuncios TO service_role;

ALTER TABLE public.sem_anuncios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lect anuncios" ON public.sem_anuncios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "escrit anuncios staff" ON public.sem_anuncios
  FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid()))
  WITH CHECK (public.sem_is_staff(auth.uid()));

CREATE TRIGGER trg_sem_anuncios_upd
  BEFORE UPDATE ON public.sem_anuncios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sem_anuncios_oferta ON public.sem_anuncios(oferta_id);

-- ─────── función recálculo de inscripción ───────
CREATE OR REPLACE FUNCTION public.sem_recalcular_inscripcion(_persona_id uuid, _programa_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promedio numeric;
  v_creditos integer;
  v_total_pensum integer;
  v_creditos_pensum integer;
  v_completo boolean := false;
  v_insc_id uuid;
BEGIN
  SELECT id INTO v_insc_id
  FROM sem_inscripciones
  WHERE persona_id = _persona_id AND programa_id = _programa_id
  ORDER BY created_at DESC LIMIT 1;

  IF v_insc_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no-inscripcion');
  END IF;

  v_promedio := public.sem_calcular_promedio(_persona_id, _programa_id);

  SELECT COALESCE(SUM(m.creditos), 0)
    INTO v_creditos
  FROM sem_inscripcion_materias im
  JOIN sem_inscripciones i ON i.id = im.inscripcion_id
  JOIN sem_materias m ON m.id = im.materia_id
  WHERE i.persona_id = _persona_id AND i.programa_id = _programa_id
    AND im.estado = 'aprobada';

  SELECT COUNT(*), COALESCE(SUM(m.creditos),0)
    INTO v_total_pensum, v_creditos_pensum
  FROM sem_pensum_materias pm
  JOIN sem_pensum_semestres s ON s.id = pm.semestre_id
  JOIN sem_materias m ON m.id = pm.materia_id
  WHERE s.programa_id = _programa_id;

  v_completo := v_total_pensum > 0 AND v_creditos >= v_creditos_pensum;

  UPDATE sem_inscripciones
  SET promedio_acumulado = v_promedio,
      total_creditos_aprobados = v_creditos,
      estado = CASE WHEN v_completo THEN 'completado' ELSE COALESCE(estado, 'activa') END
  WHERE id = v_insc_id;

  RETURN jsonb_build_object(
    'ok', true,
    'promedio', v_promedio,
    'creditos_aprobados', v_creditos,
    'creditos_pensum', v_creditos_pensum,
    'completo', v_completo,
    'inscripcion_id', v_insc_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sem_recalcular_inscripcion(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sem_recalcular_inscripcion(uuid,uuid) TO authenticated, service_role;
