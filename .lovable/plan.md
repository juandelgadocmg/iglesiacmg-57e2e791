## Alcance

Reemplazar todos los `PlaceholderSection` del Seminario por módulos funcionales completos, reutilizando las tablas que ya existen (`sem_evaluaciones`, `sem_calificaciones`, `sem_asistencias`, `sem_recursos`, `sem_ofertas`, `sem_inscripciones`, `sem_inscripcion_materias`, `certificados`). No se inventan tablas nuevas salvo las 2 mínimas indicadas en "Cambios de BD".

## Módulos a entregar (orden de implementación)

### 1. Docentes
Pantalla con la lista de docentes (derivada de `sem_ofertas.docente_persona_id` + `personas` con rol docente). Métricas por docente: nº de materias asignadas, periodo activo, total estudiantes, promedio de notas finales. Detalle: lista de materias, link a su programación.

### 2. Aula Virtual
Vista por **oferta activa**: cabecera de la materia (docente, horario, aula, modalidad, link Zoom si aplica), tabs:
- **Estudiantes** matriculados (foto, nombre, estado, nota acumulada)
- **Recursos** de la materia (lectura de `sem_recursos`, leer-solo aquí)
- **Anuncios** (texto plano persistido en `sem_anuncios`, ver "Cambios de BD")
- **Próximas evaluaciones**

Filtros por periodo y materia. Acceso: staff Seminario + docente asignado + estudiante matriculado (cada uno con scope distinto).

### 3. Evaluaciones
CRUD sobre `sem_evaluaciones` por oferta: nombre, tipo (quiz, parcial, final, taller, asistencia), peso %, fecha, publicada sí/no, descripción. Validación: suma de pesos por oferta debe poder llegar a 100% (warning si no). Botón "Publicar/Despublicar" para mostrar/ocultar al estudiante.

### 4. Calificaciones (Libreta del docente)
Matriz por oferta: filas = estudiantes matriculados, columnas = evaluaciones, celdas = nota editable (0–5). Cálculo automático de **definitiva ponderada**. Al guardar:
- Upsert en `sem_calificaciones`
- Recalcular `sem_inscripcion_materias.nota_final` y `estado` (aprobada ≥3.0, reprobada <3.0, en_curso si faltan notas)
- Si todas las materias del programa quedan aprobadas → trigger del módulo Certificados (paso 7)
Acciones: cerrar período (bloquea edición y dispara recálculo de `sem_inscripciones.promedio_acumulado` y `total_creditos_aprobados`).

### 5. Asistencia
Por oferta + fecha:
- Lista de estudiantes con select (Presente/Tarde/Ausente/Justificado) + observación
- Upsert masivo en `sem_asistencias`
- Importar Excel y registro por QR (reusando `QrAttendanceScanner`)
- Reporte por estudiante: % asistencia por materia y alerta si < 80%
- Tipo de evaluación "asistencia" en `sem_evaluaciones` puede tomar la nota directo del % asistencia del periodo

### 6. Biblioteca Digital
CRUD sobre `sem_recursos` por programa/materia: tipo (PDF, video, link, audio), título, descripción, URL/archivo (bucket `recursos-academicos` existente), restricción (público a estudiantes activos / solo staff / solo docente). Filtros + búsqueda + tarjetas.

### 7. Certificados (Seminario)
Plantilla nueva en `certificados` con `tipo_certificado='seminario_diploma'`. Generación:
- **Manual** desde lista de inscripciones aprobadas (botón "Emitir diploma")
- **Automática** vía edge function `sem-emitir-diploma` invocada cuando se cierra el último semestre con todas las materias aprobadas (la chequea `sem_calificaciones` al guardar nota final)
- PDF con jsPDF: nombre, programa, total créditos, promedio, fecha, QR a `/verificar-academico/:id` (ya existe)
- Lista por estudiante con descarga individual + lote (ya implementado en EstudiantesSection — se enlazará desde aquí)

### 8. Reportes
Pestañas:
- **Académico**: promedio por programa/periodo, tasa de aprobación por materia, materias con mayor reprobación
- **Retención**: estudiantes activos vs retirados por semestre (cohortes)
- **Asistencia**: promedio de asistencia por materia, top materias con inasistencia
- **Financiero (mora)**: pendientes de pago > 30 días, monto total por concepto (lee `sem_pagos_inscripcion`)
- **Kárdex masivo**: selector multi y exporta PDFs (reusa `seminarioPdf.ts`)

Filtros globales por programa, periodo, sede. Exportable a Excel/PDF con `exportUtils.ts`.

### 9. Dashboard
KPIs en cards + gráficos (recharts):
- Estudiantes activos por programa
- Promedio general acumulado
- % mora
- Próximas evaluaciones (próximos 7 días)
- Materias con asistencia baja
- Últimos certificados emitidos

## Cambios de BD (mínimos)

Migración única con 2 tablas nuevas y 1 función:
- `sem_anuncios` (oferta_id, autor_user_id, titulo, mensaje, created_at) + RLS staff+docente escribe / matriculados leen
- `sem_kardex_cache` opcional (vista materializada para reportes pesados) — solo si Reportes resulta lento
- Función `sem_recalcular_inscripcion(persona_id, programa_id)` que recalcula promedio/créditos/estado de la inscripción y retorna si completó el programa

GRANTs + RLS en el bloque estándar.

## Permisos (extender `permissions.ts`)

Nuevas acciones:
- `seminario:evaluacion_crud` — staff + docente asignado
- `seminario:calificacion_edit` — staff + docente asignado
- `seminario:asistencia_edit` — staff + docente asignado
- `seminario:biblioteca_crud` — staff + docente
- `seminario:certificar` — ya existe
- `seminario:reportes` — staff
- `seminario:anuncios_crud` — staff + docente

## Arquitectura técnica

- Hooks nuevos en `useSeminario.ts` (mismas convenciones: react-query + invalidate al editar). Hooks: `useDocentes`, `useOfertaDetalle`, `useEvaluaciones`, `useCalificacionesMatriz`, `useAsistenciaOferta`, `useRecursos`, `useDiplomaSeminario`, `useReportesAcademicos`, `useDashboardKpis`.
- Componentes:
  - `src/components/seminario/DocentesSection.tsx`
  - `src/components/seminario/AulaVirtualSection.tsx`
  - `src/components/seminario/EvaluacionesSection.tsx`
  - `src/components/seminario/CalificacionesSection.tsx`
  - `src/components/seminario/AsistenciaSection.tsx`
  - `src/components/seminario/BibliotecaSection.tsx`
  - `src/components/seminario/CertificadosSection.tsx`
  - `src/components/seminario/ReportesSection.tsx`
  - `src/components/seminario/DashboardSection.tsx`
- Edge function: `sem-emitir-diploma` (opcional, server-side genera código único + audit log + dispara correo).
- Auditoría: log en `sem_audit_log` para `evaluacion.crud`, `calificacion.guardada`, `asistencia.guardada`, `recurso.crud`, `diploma.emitido`, `anuncio.crud`.
- Exportación: reusa `exportUtils.ts`, `seminarioPdf.ts`, `jsPDF + autoTable`.

## Entrega por fases (para no romper nada)

| Fase | Módulos | Riesgo |
|------|---------|--------|
| 2A | Docentes + Evaluaciones + Calificaciones + función de recálculo | Medio (toca cálculo de promedio) |
| 2B | Asistencia + Aula Virtual + Anuncios | Bajo |
| 2C | Biblioteca + Certificados (auto) + edge fn diploma | Bajo |
| 2D | Reportes + Dashboard | Bajo |

Cada fase queda navegable y testeable al terminar. Ningún placeholder restante después de 2D.

## Fuera de alcance

- Integración Zoom API real (depende de los 3 secretos, ya hay UI de configuración).
- Pagos con pasarela (solo registro manual, ya existe).
- App móvil dedicada (todo responsive web).

## Preguntas antes de empezar

Si confirmas, arranco con **Fase 2A**. Pero antes necesito 2 definiciones:

1. **Escala de notas**: ¿0–5 (estándar Colombia, aprobado ≥3.0) o 0–100? Tengo asumido 0–5.
2. **Plantilla del diploma**: ¿usamos el diseño del módulo Certificados que ya existe (jsPDF con escudo CMG) o quieres uno específico para Seminario con campos extra (promedio, créditos, código de verificación)?
