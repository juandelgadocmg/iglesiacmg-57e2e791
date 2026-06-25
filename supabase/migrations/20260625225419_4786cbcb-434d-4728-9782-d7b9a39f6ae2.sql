
-- 1. Fix mutable search_path
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.prog_evento_ts(date, text) SET search_path = public;

-- 2. Revoke EXECUTE on all SECURITY DEFINER public functions, then re-grant only what's needed.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sem_is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sem_is_tesoreria(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_for_export() TO authenticated;
GRANT EXECUTE ON FUNCTION public.msg_send_system(text, uuid[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.msg_recipients_by_oferta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.msg_recipients_by_programa(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.msg_recipients_by_role(app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sem_puede_inscribir(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sem_recalcular_inscripcion(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sem_calcular_promedio(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sem_estudiante_tiene_mora(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sem_inscripciones_sin_vincular() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_user_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sem_resolve_user_id_from_persona(uuid) TO authenticated;

-- 3. prog_audit_log
DROP POLICY IF EXISTS "Auth read prog_audit" ON public.prog_audit_log;
DROP POLICY IF EXISTS "Auth insert prog_audit" ON public.prog_audit_log;

CREATE POLICY "Staff read prog_audit" ON public.prog_audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
  );

CREATE POLICY "Insert own prog_audit" ON public.prog_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
  );

-- 4. prog_reemplazos
DROP POLICY IF EXISTS "Auth manage prog_reemplazos" ON public.prog_reemplazos;

CREATE POLICY "Read own or staff prog_reemplazos" ON public.prog_reemplazos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id IN (persona_solicita_id, persona_reemplazo_id)
        AND lower(p.email) = lower(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Insert own prog_reemplazos" ON public.prog_reemplazos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = persona_solicita_id
        AND lower(p.email) = lower(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Update own or staff prog_reemplazos" ON public.prog_reemplazos
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = persona_solicita_id
        AND lower(p.email) = lower(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = persona_solicita_id
        AND lower(p.email) = lower(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Delete own or staff prog_reemplazos" ON public.prog_reemplazos
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = persona_solicita_id
        AND lower(p.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 5. sem_zoom_sesiones
DROP POLICY IF EXISTS "lect zoom" ON public.sem_zoom_sesiones;

CREATE POLICY "lect zoom staff o inscritos" ON public.sem_zoom_sesiones
  FOR SELECT TO authenticated
  USING (
    public.sem_is_staff(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.sem_inscripcion_materias im
      JOIN public.sem_inscripciones i ON i.id = im.inscripcion_id
      WHERE im.oferta_id = sem_zoom_sesiones.oferta_id
        AND i.user_id = auth.uid()
    )
  );

-- 6. servicio_ministerios / servicio_programacion
DROP POLICY IF EXISTS "auth manage servicio_ministerios" ON public.servicio_ministerios;
CREATE POLICY "staff manage servicio_ministerios" ON public.servicio_ministerios
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
  );

DROP POLICY IF EXISTS "auth manage servicio_programacion" ON public.servicio_programacion;
CREATE POLICY "staff manage servicio_programacion" ON public.servicio_programacion
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
  );

-- 7. soportes-tesoreria: replace public read with role-based read
DROP POLICY IF EXISTS "Soportes tesoreria publico read" ON storage.objects;
CREATE POLICY "Soportes tesoreria roles read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'soportes-tesoreria'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'pastor')
      OR public.has_role(auth.uid(), 'tesoreria')
    )
  );

-- 8. avatars: ownership on UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;

CREATE POLICY "Owner can delete avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Owner can update avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- 9. banners: admin only upload/delete
DROP POLICY IF EXISTS "Authenticated can delete banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload banners" ON storage.objects;

CREATE POLICY "Admin upload banners" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'banners'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Admin delete banners" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'banners'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- 10. recursos-academicos: staff upload/delete
DROP POLICY IF EXISTS "Authenticated can delete recursos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload recursos" ON storage.objects;

CREATE POLICY "Staff upload recursos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'recursos-academicos'
    AND (
      public.has_role(auth.uid(), 'maestro')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'pastor')
    )
  );

CREATE POLICY "Staff delete recursos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'recursos-academicos'
    AND (
      public.has_role(auth.uid(), 'maestro')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'pastor')
    )
  );
