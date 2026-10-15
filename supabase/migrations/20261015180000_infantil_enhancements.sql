-- Migración de Mejoras para el Módulo de Iglesia Infantil
-- Fecha: 2026-10-15

-- 1. Asegurar tabla infantil_atenciones
CREATE TABLE IF NOT EXISTS public.infantil_atenciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nino_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    checkin_id UUID REFERENCES public.infantil_asistencia_checkin(id) ON DELETE SET NULL,
    maestro_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
    responsable_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
    tipo_solicitud TEXT NOT NULL,
    estado TEXT DEFAULT 'Pendiente',
    prioridad TEXT DEFAULT 'Normal',
    observaciones TEXT,
    sintomas TEXT,
    temperatura NUMERIC(4,2),
    necesita_acudiente BOOLEAN DEFAULT false,
    fecha_solicitud DATE DEFAULT CURRENT_DATE,
    hora_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    hora_atencion TIMESTAMP WITH TIME ZONE,
    hora_cierre TIMESTAMP WITH TIME ZONE,
    historial_cambios JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.infantil_atenciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en infantil_atenciones a autenticados" ON public.infantil_atenciones;
CREATE POLICY "Permitir todo en infantil_atenciones a autenticados" ON public.infantil_atenciones FOR ALL TO authenticated USING (true);

-- 2. Asegurar maestro auxiliar en infantil_clases
ALTER TABLE public.infantil_clases ADD COLUMN IF NOT EXISTS maestro_auxiliar_id UUID REFERENCES public.personas(id) ON DELETE SET NULL;

-- 3. Tabla de Seguimiento Pastoral Infantil
CREATE TABLE IF NOT EXISTS public.infantil_seguimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nino_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    lider_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL DEFAULT 'General', -- 'Ausencia', 'Bienvenida', 'Cumpleaños', 'Salud', 'General'
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME,
    estado TEXT NOT NULL DEFAULT 'Pendiente', -- 'Pendiente', 'Completado', 'Cancelado'
    prioridad TEXT NOT NULL DEFAULT 'Normal', -- 'Normal', 'Alta', 'Urgente'
    notas TEXT NOT NULL,
    resultado TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.infantil_seguimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en infantil_seguimientos a autenticados" ON public.infantil_seguimientos;
CREATE POLICY "Permitir todo en infantil_seguimientos a autenticados" ON public.infantil_seguimientos FOR ALL TO authenticated USING (true);
