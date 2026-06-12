
-- =========== ENTREGAS DE TRABAJOS ===========
CREATE TABLE public.sem_entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id uuid NOT NULL REFERENCES public.sem_evaluaciones(id) ON DELETE CASCADE,
  inscripcion_materia_id uuid NOT NULL REFERENCES public.sem_inscripcion_materias(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archivo_url text,
  archivo_path text,
  archivo_nombre text,
  archivo_tipo text,
  archivo_tamano integer,
  comentario text,
  estado text NOT NULL DEFAULT 'enviada',
  calificado_por uuid,
  retroalimentacion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(evaluacion_id, inscripcion_materia_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_entregas TO authenticated;
GRANT ALL ON public.sem_entregas TO service_role;
ALTER TABLE public.sem_entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff lee entregas" ON public.sem_entregas FOR SELECT TO authenticated
  USING (sem_is_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "estudiante crea/edita entrega propia" ON public.sem_entregas FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR sem_is_staff(auth.uid()));
CREATE POLICY "estudiante actualiza entrega propia" ON public.sem_entregas FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR sem_is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR sem_is_staff(auth.uid()));
CREATE POLICY "borrar entrega" ON public.sem_entregas FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR sem_is_staff(auth.uid()));

CREATE TRIGGER trg_sem_entregas_updated BEFORE UPDATE ON public.sem_entregas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== FOROS ===========
CREATE TABLE public.sem_foros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL REFERENCES public.sem_ofertas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  autor_user_id uuid,
  autor_nombre text,
  fijado boolean NOT NULL DEFAULT false,
  cerrado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_foros TO authenticated;
GRANT ALL ON public.sem_foros TO service_role;
ALTER TABLE public.sem_foros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect foros" ON public.sem_foros FOR SELECT TO authenticated USING (true);
CREATE POLICY "crear foro" ON public.sem_foros FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "editar foro" ON public.sem_foros FOR UPDATE TO authenticated
  USING (autor_user_id = auth.uid() OR sem_is_staff(auth.uid()))
  WITH CHECK (autor_user_id = auth.uid() OR sem_is_staff(auth.uid()));
CREATE POLICY "borrar foro" ON public.sem_foros FOR DELETE TO authenticated
  USING (autor_user_id = auth.uid() OR sem_is_staff(auth.uid()));
CREATE TRIGGER trg_sem_foros_updated BEFORE UPDATE ON public.sem_foros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sem_foro_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foro_id uuid NOT NULL REFERENCES public.sem_foros(id) ON DELETE CASCADE,
  autor_user_id uuid,
  autor_nombre text,
  autor_avatar text,
  mensaje text NOT NULL,
  parent_id uuid REFERENCES public.sem_foro_mensajes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_foro_mensajes TO authenticated;
GRANT ALL ON public.sem_foro_mensajes TO service_role;
ALTER TABLE public.sem_foro_mensajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lect mensajes foro" ON public.sem_foro_mensajes FOR SELECT TO authenticated USING (true);
CREATE POLICY "crear mensaje foro" ON public.sem_foro_mensajes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "editar mensaje propio" ON public.sem_foro_mensajes FOR UPDATE TO authenticated
  USING (autor_user_id = auth.uid() OR sem_is_staff(auth.uid()))
  WITH CHECK (autor_user_id = auth.uid() OR sem_is_staff(auth.uid()));
CREATE POLICY "borrar mensaje" ON public.sem_foro_mensajes FOR DELETE TO authenticated
  USING (autor_user_id = auth.uid() OR sem_is_staff(auth.uid()));
CREATE TRIGGER trg_sem_foro_mensajes_updated BEFORE UPDATE ON public.sem_foro_mensajes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== ZOOM SESIONES: campo grabacion_url (puede no existir) ===========
ALTER TABLE public.sem_zoom_sesiones 
  ADD COLUMN IF NOT EXISTS grabacion_url text,
  ADD COLUMN IF NOT EXISTS realizada boolean NOT NULL DEFAULT false;

-- =========== STORAGE POLICIES bucket sem-entregas ===========
CREATE POLICY "entregas lectura propia o staff" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sem-entregas' AND (
    sem_is_staff(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text
  ));
CREATE POLICY "entregas subir carpeta propia" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sem-entregas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "entregas actualizar propio" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'sem-entregas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "entregas borrar propio o staff" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'sem-entregas' AND (
    sem_is_staff(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text
  ));
