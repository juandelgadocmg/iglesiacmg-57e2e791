-- Agrega el campo "Barrio" a personas (usado en la ficha de membresía / módulo de Afirmación)
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS barrio TEXT;
COMMENT ON COLUMN public.personas.barrio IS 'Barrio de residencia (ficha de membresía / módulo de Afirmación)';

-- Índices para acelerar el módulo de Afirmación, que filtra por tipo_persona / tipos_persona
-- y ordena/filtra por fecha de ingreso.
CREATE INDEX IF NOT EXISTS idx_personas_tipo_persona ON public.personas (tipo_persona);
CREATE INDEX IF NOT EXISTS idx_personas_tipos_persona ON public.personas USING GIN (tipos_persona);
CREATE INDEX IF NOT EXISTS idx_personas_fecha_ingreso ON public.personas (fecha_ingreso);
