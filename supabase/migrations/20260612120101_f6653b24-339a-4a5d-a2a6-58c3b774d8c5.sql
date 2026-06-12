
-- 1) Lecturas de anuncios
CREATE TABLE public.sem_anuncios_lecturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anuncio_id uuid NOT NULL REFERENCES public.sem_anuncios(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  leido_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(anuncio_id, persona_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_anuncios_lecturas TO authenticated;
GRANT ALL ON public.sem_anuncios_lecturas TO service_role;
ALTER TABLE public.sem_anuncios_lecturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect lecturas propio o staff" ON public.sem_anuncios_lecturas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.sem_is_staff(auth.uid()));
CREATE POLICY "crear lectura propia" ON public.sem_anuncios_lecturas
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "borrar lectura propia o staff" ON public.sem_anuncios_lecturas
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.sem_is_staff(auth.uid()));
CREATE INDEX idx_sem_anuncios_lecturas_persona ON public.sem_anuncios_lecturas(persona_id);

-- 2) Historial de versiones de entregas
ALTER TABLE public.sem_entregas
  DROP CONSTRAINT IF EXISTS sem_entregas_evaluacion_id_inscripcion_materia_id_key;
ALTER TABLE public.sem_entregas
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_sem_entregas_ev_im_ver
  ON public.sem_entregas(evaluacion_id, inscripcion_materia_id, version DESC);

-- 3) Recursos: permitir filtrar por periodo
ALTER TABLE public.sem_recursos
  ADD COLUMN IF NOT EXISTS periodo_id uuid REFERENCES public.sem_periodos(id) ON DELETE SET NULL;
