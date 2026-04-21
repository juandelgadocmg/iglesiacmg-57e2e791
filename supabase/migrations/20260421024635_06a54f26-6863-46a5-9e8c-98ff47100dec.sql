-- Tabla para registro de ofrendas físicas entregadas por Casas de Paz
CREATE TABLE public.tesoreria_ofrendas_cdp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  semana_inicio DATE NOT NULL,
  semana_fin DATE NOT NULL,
  valor_entregado NUMERIC NOT NULL DEFAULT 0,
  fecha_entrega DATE,
  observacion TEXT,
  registrado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, semana_inicio)
);

-- Índice para búsquedas rápidas por semana
CREATE INDEX idx_tesoreria_cdp_semana ON public.tesoreria_ofrendas_cdp (semana_inicio);
CREATE INDEX idx_tesoreria_cdp_grupo ON public.tesoreria_ofrendas_cdp (grupo_id);

-- RLS
ALTER TABLE public.tesoreria_ofrendas_cdp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role-scoped manage tesoreria_ofrendas_cdp"
ON public.tesoreria_ofrendas_cdp
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'tesoreria'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'tesoreria'::app_role)
);

-- Trigger para updated_at
CREATE TRIGGER update_tesoreria_cdp_updated_at
BEFORE UPDATE ON public.tesoreria_ofrendas_cdp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();