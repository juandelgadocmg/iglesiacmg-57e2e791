-- Add clasificacion_cdp column to personas table
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS clasificacion_cdp TEXT;
