DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile basic fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND persona_id IS NOT DISTINCT FROM (
    SELECT p.persona_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND persona_id IS NOT DISTINCT FROM (
    SELECT p.persona_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
  )
);