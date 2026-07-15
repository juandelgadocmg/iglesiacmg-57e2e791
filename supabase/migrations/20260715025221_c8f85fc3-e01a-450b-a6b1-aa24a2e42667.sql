
-- 1) Revoke EXECUTE on strictly internal SECURITY DEFINER functions
DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'public.email_queue_wake()',
    'public.email_queue_dispatch()',
    'public.sem_sync_inscripciones_from_profile()',
    'public.prevent_profile_persona_self_update()',
    'public.sem_reindex_vinculos()',
    'public.sem_inscripciones_sin_vincular()',
    'public.msg_send_system(text, uuid[], text, text)',
    'public.resolve_user_id_by_email(text)',
    'public.sem_resolve_user_id_from_persona(uuid)',
    'public.msg_recipients_by_oferta(uuid)',
    'public.msg_recipients_by_programa(uuid, integer)',
    'public.msg_recipients_by_role(app_role)',
    'public.msg_resolve_recipients(text, text, integer, uuid[])',
    'public.msg_process_scheduled()',
    'public.prog_send_reminders()',
    'public.sem_inscripciones_set_user_id()',
    'public.sem_set_periodo_ingreso()',
    'public.sem_audit_inscripcion_changes()',
    'public.sem_msg_nueva_evaluacion()',
    'public.sem_msg_welcome_inscripcion()',
    'public.sem_msg_zoom_sesion()',
    'public.sem_msg_calificacion()',
    'public.msg_after_message_insert()',
    'public.handle_new_user()',
    'public.cita_consejeria_intercesion()',
    'public.sync_grupo_miembros_from_persona()',
    'public.prevent_duplicate_reporte_grupo_fecha()',
    'public.update_updated_at_column()',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.enqueue_email(text, jsonb)',
    'public.delete_email(text, bigint)',
    'public.read_email_batch(text, integer, integer)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      -- ignore missing
      NULL;
    END;
  END LOOP;
END $$;

-- 2) Revoke anon EXECUTE on RLS/permission helpers (must remain executable by authenticated for RLS to work)
DO $$
DECLARE
  fn text;
  auth_only_fns text[] := ARRAY[
    'public.has_role(uuid, app_role)',
    'public.sem_is_staff(uuid)',
    'public.sem_is_tesoreria(uuid)',
    'public.sem_persona_id_for_user(uuid)',
    'public.msg_is_participant(uuid, uuid)',
    'public.sem_user_enrolled_programa(uuid, uuid)',
    'public.sem_user_enrolled_oferta(uuid, uuid)',
    'public.sem_user_enrolled_periodo(uuid, uuid)',
    'public.sem_user_enrolled_materia(uuid, uuid)',
    'public.sem_user_enrolled_foro(uuid, uuid)',
    'public.sem_user_owns_inscripcion(uuid, uuid)',
    'public.sem_user_owns_inscripcion_materia(uuid, uuid)',
    'public.sem_user_can_read_recurso(uuid, uuid, uuid, uuid)',
    'public.sem_calcular_promedio(uuid, uuid)',
    'public.sem_estudiante_tiene_mora(uuid)',
    'public.sem_puede_inscribir(uuid, uuid)',
    'public.sem_recalcular_inscripcion(uuid, uuid)',
    'public.sem_get_mi_persona()',
    'public.sem_usuario_vinculacion_status()',
    'public.get_users_for_export()',
    'public.prog_evento_ts(date, text)'
  ];
BEGIN
  FOREACH fn IN ARRAY auth_only_fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 3) Fix avatars storage bucket: enforce user folder ownership on INSERT
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);
