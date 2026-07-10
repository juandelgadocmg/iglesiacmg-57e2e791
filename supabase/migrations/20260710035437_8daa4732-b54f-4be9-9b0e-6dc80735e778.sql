DROP POLICY IF EXISTS threads_select_participant ON public.msg_threads;
CREATE POLICY threads_select_participant ON public.msg_threads FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.msg_is_participant(id, auth.uid()));

DROP POLICY IF EXISTS threads_update_participant ON public.msg_threads;
CREATE POLICY threads_update_participant ON public.msg_threads FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.msg_is_participant(id, auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.msg_is_participant(id, auth.uid()));