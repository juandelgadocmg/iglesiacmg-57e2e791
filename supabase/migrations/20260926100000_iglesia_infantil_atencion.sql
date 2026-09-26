-- Migration for Módulo Iglesia Infantil - Atención y Comunicación
-- Author: Antigravity
-- Date: 2026-09-26

-- 1. Enum para Estados de Atención
CREATE TYPE estado_atencion_infantil AS ENUM (
    'Pendiente',
    'En atención',
    'Atendido',
    'Escalado'
);

-- 2. Enum para Tipos de Atención
CREATE TYPE tipo_atencion_infantil AS ENUM (
    'Baño',
    'Acudiente',
    'Malestar',
    'Urgencia',
    'Comportamiento',
    'Especial',
    'Otro'
);

-- 3. Tabla: infantil_atenciones (Centro de Atención del Niño)
CREATE TABLE IF NOT EXISTS public.infantil_atenciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nino_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    checkin_id UUID REFERENCES public.infantil_asistencia_checkin(id) ON DELETE SET NULL,
    maestro_id UUID REFERENCES public.personas(id) ON DELETE SET NULL, -- Quién la creó
    responsable_id UUID REFERENCES public.personas(id) ON DELETE SET NULL, -- Coordinador que atiende
    
    tipo_solicitud tipo_atencion_infantil NOT NULL,
    estado estado_atencion_infantil DEFAULT 'Pendiente',
    prioridad TEXT CHECK (prioridad IN ('Normal', 'Prioritaria', 'Urgente')) DEFAULT 'Normal',
    
    observaciones TEXT,
    sintomas TEXT,
    temperatura NUMERIC(4,2), -- ej. 37.5
    necesita_acudiente BOOLEAN DEFAULT false,
    
    -- Trazabilidad de tiempos
    fecha_solicitud DATE DEFAULT CURRENT_DATE,
    hora_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    hora_atencion TIMESTAMP WITH TIME ZONE,
    hora_cierre TIMESTAMP WITH TIME ZONE,
    
    -- Trazabilidad de cambios (JSON array)
    historial_cambios JSONB DEFAULT '[]'::jsonb
);

-- 4. Tabla: infantil_comunicaciones (Historial bidireccional Iglesia <-> Acudiente)
CREATE TABLE IF NOT EXISTS public.infantil_comunicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atencion_id UUID REFERENCES public.infantil_atenciones(id) ON DELETE SET NULL,
    nino_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    acudiente_id UUID REFERENCES public.personas(id) ON DELETE CASCADE,
    remitente_id UUID REFERENCES public.personas(id) ON DELETE SET NULL, -- NULL si es del sistema
    
    canal TEXT CHECK (canal IN ('Interno', 'WhatsApp', 'SMS', 'Correo')) DEFAULT 'Interno',
    tipo_mensaje TEXT CHECK (tipo_mensaje IN ('Notificación', 'Solicitud Acudiente', 'Alerta Médica', 'Respuesta', 'Llegada')) DEFAULT 'Notificación',
    mensaje TEXT NOT NULL,
    
    estado_envio TEXT CHECK (estado_envio IN ('Pendiente', 'Enviado', 'Fallido', 'Entregado')) DEFAULT 'Pendiente',
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    fecha_lectura TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.infantil_atenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infantil_comunicaciones ENABLE ROW LEVEL SECURITY;

-- Políticas Básicas Atenciones (Los maestros y coordinadores pueden ver/insertar)
CREATE POLICY "Visualización de atenciones infantil" 
    ON public.infantil_atenciones FOR SELECT 
    USING (true); -- Ajustar con role checks reales si es necesario en DOXA

CREATE POLICY "Inserción de atenciones infantil" 
    ON public.infantil_atenciones FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Actualización de atenciones infantil" 
    ON public.infantil_atenciones FOR UPDATE 
    USING (true);

-- Políticas Básicas Comunicaciones
CREATE POLICY "Visualización de comunicaciones infantil" 
    ON public.infantil_comunicaciones FOR SELECT 
    USING (true);

CREATE POLICY "Inserción de comunicaciones infantil" 
    ON public.infantil_comunicaciones FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Actualización de comunicaciones infantil" 
    ON public.infantil_comunicaciones FOR UPDATE 
    USING (true);

-- Trigger para automatizar historial de cambios en infantil_atenciones
CREATE OR REPLACE FUNCTION log_infantil_atencion_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado OR OLD.responsable_id IS DISTINCT FROM NEW.responsable_id THEN
        NEW.historial_cambios = COALESCE(OLD.historial_cambios, '[]'::jsonb) || jsonb_build_object(
            'fecha', now(),
            'estado_anterior', OLD.estado,
            'estado_nuevo', NEW.estado,
            'responsable_anterior', OLD.responsable_id,
            'responsable_nuevo', NEW.responsable_id,
            'usuario_modificador', auth.uid() -- O la persona_id si viene en el claim
        );
    END IF;
    
    -- Auto registrar fechas
    IF OLD.estado = 'Pendiente' AND NEW.estado = 'En atención' AND NEW.hora_atencion IS NULL THEN
        NEW.hora_atencion = now();
    END IF;
    
    IF NEW.estado IN ('Atendido', 'Escalado') AND OLD.estado NOT IN ('Atendido', 'Escalado') AND NEW.hora_cierre IS NULL THEN
        NEW.hora_cierre = now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_infantil_atencion
    BEFORE UPDATE ON public.infantil_atenciones
    FOR EACH ROW
    EXECUTE FUNCTION log_infantil_atencion_changes();
