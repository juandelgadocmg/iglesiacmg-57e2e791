
ALTER TABLE public.configuracion_iglesia
  ADD COLUMN IF NOT EXISTS discipulando_url text DEFAULT 'https://discipulandonaciones.lovable.app';
