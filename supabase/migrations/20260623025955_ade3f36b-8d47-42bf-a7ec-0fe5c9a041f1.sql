
-- Mensajería interna (Correo Interno) ===========================================

CREATE TABLE public.msg_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL DEFAULT '(sin asunto)',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.msg_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.msg_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_msg_messages_thread ON public.msg_messages(thread_id, created_at);

CREATE TABLE public.msg_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.msg_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'to', -- 'from' | 'to' | 'cc'
  is_read boolean NOT NULL DEFAULT false,
  is_important boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  last_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);
CREATE INDEX idx_msg_participants_user ON public.msg_participants(user_id, is_deleted, is_archived);

CREATE TABLE public.msg_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.msg_messages(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_msg_attachments_message ON public.msg_attachments(message_id);

CREATE TABLE public.msg_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  reply_thread_id uuid REFERENCES public.msg_threads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_msg_drafts_user ON public.msg_drafts(user_id, updated_at DESC);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.msg_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.msg_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.msg_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.msg_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.msg_drafts TO authenticated;
GRANT ALL ON public.msg_threads, public.msg_messages, public.msg_participants, public.msg_attachments, public.msg_drafts TO service_role;

-- Helper: is the user a participant of a thread
CREATE OR REPLACE FUNCTION public.msg_is_participant(_thread_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.msg_participants WHERE thread_id = _thread_id AND user_id = _user_id)
$$;

-- RLS
ALTER TABLE public.msg_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_drafts ENABLE ROW LEVEL SECURITY;

-- threads: visible to participants; insert by auth user as creator
CREATE POLICY "threads_select_participant" ON public.msg_threads FOR SELECT TO authenticated
  USING (public.msg_is_participant(id, auth.uid()));
CREATE POLICY "threads_insert_self" ON public.msg_threads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "threads_update_participant" ON public.msg_threads FOR UPDATE TO authenticated
  USING (public.msg_is_participant(id, auth.uid()));

-- messages: participants can read; sender writes
CREATE POLICY "messages_select_participant" ON public.msg_messages FOR SELECT TO authenticated
  USING (public.msg_is_participant(thread_id, auth.uid()));
CREATE POLICY "messages_insert_participant" ON public.msg_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.msg_is_participant(thread_id, auth.uid()));

-- participants: a user can see their own participant rows AND rows of threads they participate in (to render recipient avatars)
CREATE POLICY "participants_select_visible" ON public.msg_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.msg_is_participant(thread_id, auth.uid()));
CREATE POLICY "participants_insert_in_own_thread" ON public.msg_participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.msg_threads t WHERE t.id = thread_id AND t.created_by = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "participants_update_own" ON public.msg_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "participants_delete_own" ON public.msg_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- attachments: participants can read; sender can insert
CREATE POLICY "attachments_select_participant" ON public.msg_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.msg_messages m WHERE m.id = message_id AND public.msg_is_participant(m.thread_id, auth.uid())));
CREATE POLICY "attachments_insert_sender" ON public.msg_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.msg_messages m WHERE m.id = message_id AND m.sender_id = auth.uid()));

-- drafts: owner-only
CREATE POLICY "drafts_owner_all" ON public.msg_drafts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- updated_at trigger
CREATE TRIGGER trg_msg_threads_updated_at BEFORE UPDATE ON public.msg_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_msg_drafts_updated_at BEFORE UPDATE ON public.msg_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When a new message is inserted, bump thread.last_message_at and mark recipients unread
CREATE OR REPLACE FUNCTION public.msg_after_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.msg_threads SET last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.thread_id;
  UPDATE public.msg_participants
     SET is_read = false, is_archived = false, is_deleted = false
   WHERE thread_id = NEW.thread_id AND user_id <> NEW.sender_id;
  -- sender row stays read
  UPDATE public.msg_participants
     SET is_read = true, last_read_at = now()
   WHERE thread_id = NEW.thread_id AND user_id = NEW.sender_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_msg_after_message_insert AFTER INSERT ON public.msg_messages
  FOR EACH ROW EXECUTE FUNCTION public.msg_after_message_insert();

-- Storage RLS for the mensajes-adjuntos bucket (created via tool)
-- Path convention: <thread_id>/<message_id>/<filename>
CREATE POLICY "msg_attach_select_participant" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'mensajes-adjuntos'
    AND public.msg_is_participant( (split_part(name,'/',1))::uuid, auth.uid())
  );
CREATE POLICY "msg_attach_insert_participant" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mensajes-adjuntos'
    AND public.msg_is_participant( (split_part(name,'/',1))::uuid, auth.uid())
  );
CREATE POLICY "msg_attach_delete_sender" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'mensajes-adjuntos'
    AND owner = auth.uid()
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.msg_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.msg_participants;
