
CREATE TABLE public.discipulando_access_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL CHECK (action IN ('open', 'error', 'retry')),
  target_url TEXT,
  error_message TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX discipulando_access_log_user_idx ON public.discipulando_access_log(user_id, created_at DESC);
CREATE INDEX discipulando_access_log_action_idx ON public.discipulando_access_log(action, created_at DESC);

GRANT SELECT, INSERT ON public.discipulando_access_log TO authenticated;
GRANT ALL ON public.discipulando_access_log TO service_role;

ALTER TABLE public.discipulando_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own access logs"
  ON public.discipulando_access_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own access logs"
  ON public.discipulando_access_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all access logs"
  ON public.discipulando_access_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
