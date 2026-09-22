-- Migration: Create sem-entregas bucket for seminario assignments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sem-entregas', 'sem-entregas', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for sem-entregas
CREATE POLICY "Authenticated can upload sem-entregas" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'sem-entregas');

CREATE POLICY "Authenticated can read sem-entregas" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'sem-entregas');

CREATE POLICY "Authenticated can update sem-entregas" 
ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'sem-entregas');

CREATE POLICY "Authenticated can delete sem-entregas" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'sem-entregas');
