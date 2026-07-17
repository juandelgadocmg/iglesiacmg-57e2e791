
CREATE TABLE public.doxa_chat_threads (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  pinned BOOLEAN NOT NULL DEFAULT false,
  updated_at_ms BIGINT NOT NULL DEFAULT 0,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX doxa_chat_threads_user_updated_idx
  ON public.doxa_chat_threads (user_id, updated_at_ms DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.doxa_chat_threads TO authenticated;
GRANT ALL ON public.doxa_chat_threads TO service_role;

ALTER TABLE public.doxa_chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doxa_chat_threads_owner_select" ON public.doxa_chat_threads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "doxa_chat_threads_owner_insert" ON public.doxa_chat_threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "doxa_chat_threads_owner_update" ON public.doxa_chat_threads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "doxa_chat_threads_owner_delete" ON public.doxa_chat_threads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.doxa_chat_threads_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER doxa_chat_threads_touch
  BEFORE UPDATE ON public.doxa_chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.doxa_chat_threads_touch_updated_at();
