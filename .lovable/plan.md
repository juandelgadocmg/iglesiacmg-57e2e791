# Módulo de Consejería Pastoral

Nueva pestaña **Consejería** dentro de `/servicios` (Reuniones) para agendar, gestionar y dar seguimiento a citas de consejería con Pastor / Pastora.

## 1. Base de datos (nuevas tablas)

- **consejeros_horarios** — disponibilidad por consejero
  - persona_id (FK personas, debe ser tipo "Pastor Principal")
  - dia_semana (0–6), hora_inicio, hora_fin, duracion_minutos (default 60), modalidad permitida (presencial/virtual/ambas), activo
- **citas_consejeria**
  - solicitante_persona_id (FK personas), solicitante_user_id (nullable, si es usuario logueado), nombre/email/telefono de respaldo
  - consejero_persona_id (FK personas)
  - fecha, hora_inicio, hora_fin
  - modalidad (presencial | virtual), enlace_virtual, lugar
  - motivo_categoria (espiritual, familiar, emocional, liderazgo, matrimonial, otro), motivo_descripcion
  - estado (pendiente, confirmada, completada, cancelada, no_asistio)
  - requiere_intercesion (bool), requiere_consolidacion (bool)
  - **Único parcial**: (consejero_persona_id, fecha, hora_inicio) donde estado != 'cancelada' → bloquea doble reserva
- **observaciones_consejeria** — seguimiento post-cita
  - cita_id, notas, estado_caso (en_proceso, cerrado, seguimiento), proxima_accion, fecha_seguimiento, created_by

**RLS**:
- Admin / pastor / super_admin: acceso completo a todas las citas y observaciones
- Secretaria: lectura de citas, puede crear a nombre de personas
- Usuario autenticado: ve sólo sus propias citas (donde solicitante_user_id = auth.uid())
- Observaciones: solo admin / pastor las ven y editan

## 2. UI — Pestaña Consejería en `/servicios`

Sub-tabs internas:

1. **Calendario** — vista tipo Google Calendar (mes/semana/día) con todas las citas. Filtros: consejero (Pastor/Pastora/Todos), modalidad. Click en cita → modal con detalle, edición, observaciones.
2. **Agendar** — wizard de 4 pasos:
   - Paso 1: Selecciona consejero (Pastor / Pastora — desde personas con tipo "Pastor Principal")
   - Paso 2: Modalidad (presencial / virtual)
   - Paso 3: Calendario de fechas + slots disponibles (calculados desde `consejeros_horarios` menos citas existentes)
   - Paso 4: Motivo (categoría sugerida + texto libre), datos contacto, confirmar
3. **Mis citas** (visible para usuarios no-staff) — lista de citas propias con estado
4. **Horarios** (solo admin/pastor) — gestión CRUD de disponibilidad por consejero, día y franja horaria
5. **Seguimiento** (admin/pastor) — listado de citas pasadas para añadir observaciones, marcar estado del caso, banderas de Intercesión / Consolidación

## 3. Notificaciones por correo

Configurar dominio de email Lovable Cloud → infraestructura de emails → 3 plantillas transaccionales:

- `consejeria-confirmacion-solicitante` — al usuario que agendó (nombre, fecha/hora, modalidad, motivo, consejero)
- `consejeria-aviso-consejero` — al pastor/pastora (datos del solicitante + cita)
- `consejeria-cancelacion` — cuando se cancela

Disparadores: tras INSERT/UPDATE de cita desde la UI se invoca `send-transactional-email` con la plantilla y `templateData` correspondientes (un envío por destinatario, idempotencyKey = `cita-{id}-{tipo}`).

## 4. Integración procesos iglesia

Las banderas `requiere_intercesion` y `requiere_consolidacion` en la cita generan automáticamente:
- Una entrada en `peticiones_oracion` (si intercesión) ligada a la persona
- Notificación in-app al líder de consolidación (si consolidación)

## 5. Permisos (permissions.ts)

- Nueva acción: `consejeria:manage` (admin, super_admin, pastor)
- Nueva acción: `consejeria:agendar` (todos los autenticados)
- Nueva acción: `consejeria:ver_todas` (admin, super_admin, pastor, secretaria)

## 6. Diseño

- Reutiliza tokens del design system (azul/blanco/gris)
- Calendario con `react-day-picker` + grilla custom de slots horarios
- Mobile: la vista calendario colapsa a lista por día; wizard apilado verticalmente
- Sigue el patrón de tabs ya usado en ServiciosPage

## Detalles técnicos

- **Tablas y triggers**: migración SQL con las 3 tablas, RLS, índice único parcial para evitar doble reserva, trigger que crea petición de oración cuando `requiere_intercesion = true`.
- **Hooks**: `useCitasConsejeria`, `useHorariosConsejeria`, `useObservacionesConsejeria`, `useSlotsDisponibles(consejeroId, fecha)` — todos con invalidación cruzada en `useDatabase.ts`.
- **Componentes nuevos**:
  - `src/pages/consejeria/ConsejeriaCalendarView.tsx`
  - `src/pages/consejeria/ConsejeriaAgendarWizard.tsx`
  - `src/pages/consejeria/ConsejeriaMisCitas.tsx`
  - `src/pages/consejeria/ConsejeriaHorariosAdmin.tsx`
  - `src/pages/consejeria/ConsejeriaSeguimiento.tsx`
  - `src/components/forms/CitaConsejeriaFormDialog.tsx`
  - `src/components/forms/HorarioConsejeroFormDialog.tsx`
  - `src/components/forms/ObservacionConsejeriaDialog.tsx`
- **ServiciosPage.tsx**: añadir `"consejeria"` al tipo `ActiveView` y nueva pestaña en el `<Tabs>`.
- **Edge functions**: 3 plantillas React Email en `supabase/functions/_shared/transactional-email-templates/` + registro en `registry.ts`.
- **Prerrequisito email**: configurar dominio de email (paso obligatorio antes de habilitar correos automáticos).
