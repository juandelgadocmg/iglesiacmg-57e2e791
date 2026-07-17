
CREATE TABLE public.doxa_chat_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Conversación DOXA IA',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doxa_chat_shares_owner ON public.doxa_chat_shares(owner_user_id);
CREATE INDEX idx_doxa_chat_shares_token ON public.doxa_chat_shares(token);

GRANT SELECT ON public.doxa_chat_shares TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doxa_chat_shares TO authenticated;
GRANT ALL ON public.doxa_chat_shares TO service_role;

ALTER TABLE public.doxa_chat_shares ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can read a share only if it hasn't expired.
CREATE POLICY "Public can read non-expired shares"
  ON public.doxa_chat_shares FOR SELECT
  USING (expires_at > now());

-- Owner can manage their own shares.
CREATE POLICY "Owners can insert their shares"
  ON public.doxa_chat_shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update their shares"
  ON public.doxa_chat_shares FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can delete their shares"
  ON public.doxa_chat_shares FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_user_id);
