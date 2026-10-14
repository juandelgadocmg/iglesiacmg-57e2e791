
-- Create redes table
CREATE TABLE public.redes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  lider_red text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.redes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_redes" ON public.redes FOR SELECT USING (true);

-- Add red_id to casas_de_paz
ALTER TABLE public.casas_de_paz ADD COLUMN red_id uuid REFERENCES public.redes(id) ON DELETE SET NULL;

-- Add casa_de_paz_id to leaders
ALTER TABLE public.leaders ADD COLUMN casa_de_paz_id uuid REFERENCES public.casas_de_paz(id) ON DELETE SET NULL;

-- Enable realtime for redes
ALTER PUBLICATION supabase_realtime ADD TABLE public.redes;
