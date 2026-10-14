-- Migration para Módulo Iglesia Infantil

-- Actualizar enum de roles si es necesario
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordinador_infantil';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recepcion_infantil';

-- Crear detalles de grupos infantiles
CREATE TABLE public.infantil_grupos_detalles (
    grupo_id UUID PRIMARY KEY REFERENCES public.grupos(id) ON DELETE CASCADE,
    edad_minima INTEGER,
    edad_maxima INTEGER,
    salon TEXT,
    capacidad INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.infantil_grupos_detalles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage infantil_grupos_detalles" ON public.infantil_grupos_detalles FOR ALL TO authenticated USING (true);

-- Crear detalles específicos para niños (extendiendo personas)
CREATE TABLE public.infantil_detalles (
    persona_id UUID PRIMARY KEY REFERENCES public.personas(id) ON DELETE CASCADE,
    codigo_interno TEXT UNIQUE,
    qr_codigo TEXT UNIQUE,
    contacto_emergencia TEXT,
    info_medica TEXT,
    alergias TEXT,
    observaciones TEXT,
    fecha_primera_asistencia DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.infantil_detalles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage infantil_detalles" ON public.infantil_detalles FOR ALL TO authenticated USING (true);

-- Relación Padres/Acudientes
CREATE TABLE public.infantil_acudientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nino_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    acudiente_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    relacion TEXT NOT NULL,
    autorizado_recoger BOOLEAN NOT NULL DEFAULT false,
    es_principal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(nino_id, acudiente_id)
);

-- Habilitar RLS
ALTER TABLE public.infantil_acudientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage infantil_acudientes" ON public.infantil_acudientes FOR ALL TO authenticated USING (true);

-- Clases Infantiles (Planificación y Registro)
CREATE TABLE public.infantil_clases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    maestro_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    tema TEXT,
    versiculo TEXT,
    objetivo TEXT,
    actividad TEXT,
    materiales TEXT,
    observaciones TEXT,
    estado TEXT NOT NULL DEFAULT 'Programada' CHECK (estado IN ('Programada', 'Realizada', 'Cancelada')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.infantil_clases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage infantil_clases" ON public.infantil_clases FOR ALL TO authenticated USING (true);

-- Asistencia y Check-in / Check-out
CREATE TABLE public.infantil_asistencia_checkin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nino_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    servicio_id UUID REFERENCES public.servicios(id) ON DELETE SET NULL,
    clase_id UUID REFERENCES public.infantil_clases(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Presente' CHECK (estado IN ('Presente', 'Ausente', 'Tarde', 'Justificado')),
    hora_entrada TIMESTAMPTZ,
    entregado_por_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
    registrado_entrada_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    hora_salida TIMESTAMPTZ,
    recogido_por_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
    registrado_salida_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(nino_id, fecha, grupo_id)
);

-- Habilitar RLS
ALTER TABLE public.infantil_asistencia_checkin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage infantil_asistencia_checkin" ON public.infantil_asistencia_checkin FOR ALL TO authenticated USING (true);

-- Seguimiento de Niños
CREATE TABLE public.infantil_seguimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nino_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    responsable_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    tipo_contacto TEXT NOT NULL,
    motivo TEXT,
    resultado TEXT,
    observaciones TEXT,
    proxima_accion TEXT,
    fecha_proximo_seguimiento DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.infantil_seguimiento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage infantil_seguimiento" ON public.infantil_seguimiento FOR ALL TO authenticated USING (true);

-- Historial de Notificaciones
CREATE TABLE public.infantil_notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nino_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    acudiente_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    canal TEXT NOT NULL DEFAULT 'Sistema',
    estado TEXT NOT NULL DEFAULT 'Enviado',
    enviado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.infantil_notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage infantil_notificaciones" ON public.infantil_notificaciones FOR ALL TO authenticated USING (true);
