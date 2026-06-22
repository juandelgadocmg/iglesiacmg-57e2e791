CREATE TABLE public.sem_materias_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id uuid NOT NULL REFERENCES public.sem_materias(id) ON DELETE CASCADE,
  campo text NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  usuario_id uuid,
  usuario_nombre text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sem_materias_historial TO authenticated;
GRANT ALL ON public.sem_materias_historial TO service_role;
ALTER TABLE public.sem_materias_historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff lectura historial" ON public.sem_materias_historial FOR SELECT TO authenticated USING (public.sem_is_staff(auth.uid()));
CREATE POLICY "Staff inserta historial" ON public.sem_materias_historial FOR INSERT TO authenticated WITH CHECK (public.sem_is_staff(auth.uid()));
CREATE INDEX idx_sem_materias_hist_materia ON public.sem_materias_historial(materia_id, created_at DESC);