# Sistema de Gestión Académica — Seminario Bíblico CMG

Expansión del módulo Academia conservando intacto lo existente (Discipulado/Escuelas). Se crea una **estructura paralela** dedicada al Seminario, accesible desde un nuevo sub-tab "Seminario" dentro de `/academia`. Mismo diseño visual (azul/blanco/gris, sidebar, tabs, cards).

## Arquitectura

Nueva tabla raíz `programas_academicos` → `pensum` (semestres) → `materias_pensum` (con créditos y prerrequisitos) → `inscripciones_semestre` → `cursadas` (instancia de materia por estudiante/periodo) → calificaciones/asistencia/recursos enlazados a `cursadas`.

Las tablas actuales (`cursos`, `materias`, `matriculas`, `calificaciones`, `asistencia_materias`, `recursos_academicos`) **no se tocan**. Discipulado sigue funcionando igual.

## Modelo de datos nuevo

| Tabla | Propósito |
|---|---|
| `sem_programas` | Programa académico (Teología Bíblica y Ministerial, futuros) |
| `sem_pensum_semestres` | 8 semestres por programa (orden, nombre, créditos totales) |
| `sem_materias` | Catálogo de materias del programa con créditos, intensidad horaria |
| `sem_materia_prerequisitos` | Relación N:N de prerrequisitos |
| `sem_pensum_materias` | Asignación materia → semestre del pensum |
| `sem_periodos` | Periodos lectivos del seminario (2026-1, 2026-2, …) |
| `sem_ofertas` | Materias ofertadas en un periodo (docente, horario, aula, cupos, link Zoom manual, meeting_id Zoom API) |
| `sem_inscripciones` | Inscripción del estudiante al periodo (estado: borrador/pagada/activa/cerrada) |
| `sem_inscripcion_materias` | Materias inscritas en esa inscripción (cursada activa) |
| `sem_calificaciones` | Notas por cursada (corte, definitiva, recuperación) |
| `sem_asistencias` | Asistencia por cursada y fecha |
| `sem_evaluaciones` | Quices, parciales, finales, trabajos (ítems calificables del seminario) |
| `sem_recursos` | Biblioteca digital: libros PDF, lecturas, videos, links por materia/programa |
| `sem_historial` | Vista materializada/función que arma el kárdex completo del estudiante |
| `sem_zoom_sesiones` | Reuniones Zoom creadas vía API por oferta |

Todas con RLS estricto: admin/super_admin/pastor → completo; docente → sólo sus ofertas; estudiante autenticado → sólo lo suyo; tesorería → lectura de inscripciones y pagos.

## Integraciones

- **Tesorería**: nueva tabla `sem_pagos_inscripcion` con concepto, valor, estado. Al activar una inscripción se valida que no exista `mora > 30 días` reutilizando la lógica de `pagos_matricula`. Función SQL `sem_estudiante_tiene_mora(persona_id)` consumida por el front antes de habilitar nueva inscripción.
- **Usuarios**: nuevos roles `seminario_admin`, `seminario_docente`, `seminario_estudiante` agregados al enum `app_role`. Se mapean en `permissions.ts` y en `RoleGuard`.
- **Zoom API**: edge function `zoom-create-meeting` que usa OAuth Server-to-Server. Requiere 3 secretos: `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`. Al crear una `sem_oferta` con modalidad virtual, llama a la función y guarda `join_url`, `meeting_id`, `password` en `sem_zoom_sesiones`. Botón "Crear sala Zoom" en el form. Link manual sigue disponible como fallback.
- **Certificados**: nueva plantilla `seminario-diploma` en el módulo Certificados existente. Trigger: cuando el estudiante completa los 8 semestres con todas las materias aprobadas (nota ≥ 3.0), un trigger SQL inserta en `certificados` y notifica al estudiante. Generación PDF reutiliza `jsPDF` con plantilla diploma horizontal.

## Submódulos (rutas dentro de `/academia/seminario`)

1. **Dashboard Académico** — KPIs (matriculados, retención, promedio general, mora), gráficos por semestre, próximas evaluaciones, alertas (inasistencia, mora, prerrequisitos)
2. **Programas** — CRUD de programas (inicial: Teología Bíblica y Ministerial, 8 sem, créditos totales)
3. **Pensum Académico** — Editor visual del pensum por programa, drag de materias por semestre, definición de prerrequisitos
4. **Materias** — Catálogo del programa, créditos, intensidad horaria, descripción, docente sugerido
5. **Aula Virtual** — Vista por materia: link Zoom, recursos, anuncios, lista de estudiantes, próxima clase
6. **Evaluaciones** — Crear quices/parciales/finales por cursada, peso porcentual, fechas, publicación
7. **Calificaciones** — Captura de notas por evaluación, cálculo automático de definitiva, vista estudiante (kárdex), reporte por materia
8. **Asistencia** — Registro manual o QR (reutiliza `QrAttendanceScanner`), reporte por materia/estudiante, alertas de inasistencias
9. **Biblioteca Digital** — Repositorio de PDFs, videos, links por materia o programa; bucket nuevo `seminario-biblioteca`
10. **Certificados** — Vista de diplomas generados, descarga, verificación pública por QR (reutiliza módulo existente)
11. **Docentes** — Gestión de docentes seminario, asignación a materias, carga horaria
12. **Reportes** — Reportes consolidados: promedio acumulado por estudiante, retención por semestre, tasas de aprobación, mora académica, kárdex PDF descargable

## Malla curricular visual

Componente `PensumGrid.tsx`: grilla 8 columnas × N filas, cada celda es una materia con código, nombre, créditos, color por área. Líneas conectoras (SVG) para prerrequisitos. Modo edición (admin) drag & drop, modo vista (estudiante) con check verde por materia aprobada, gris por cursando, rojo por reprobada/pendiente prerrequisito.

## Promedio acumulado

Función SQL `sem_calcular_promedio(persona_id, programa_id)`:
```text
promedio = SUM(nota_final * creditos) / SUM(creditos)
```
Trigger al insertar/actualizar `sem_calificaciones` actualiza un campo cached `promedio_acumulado` en `sem_inscripciones` para evitar recalcular en cada query.

## Control de prerrequisitos

Antes de inscribir una materia, función `sem_puede_inscribir(persona_id, materia_id)` valida que todos los prerrequisitos estén aprobados (nota ≥ 3.0). Si falla, devuelve la lista de pendientes y el front bloquea el chip.

## Fases de entrega

Por el tamaño real (≈15 tablas, ≈12 páginas nuevas, 1 edge function Zoom, integración tesorería + certificados), divido en **4 PRs encadenados**. Cada fase queda funcional y desplegable. Total estimado: 4 turnos de construcción.

### Fase 1 — Cimientos (este turno)
- Migración SQL con las 15 tablas + RLS + grants + roles nuevos
- Hooks base (`useProgramas`, `usePensum`, `useMaterias`, `useOfertas`, `useInscripciones`)
- Página `/academia/seminario` con sub-tabs vacíos
- CRUD de **Programas**, **Pensum** (editor visual), **Materias** (con prerrequisitos)
- Seed del programa "Teología Bíblica y Ministerial" con los 8 semestres vacíos
- Carga del pensum real **cuando envíes el Excel/PDF**

### Fase 2 — Operación lectiva
- **Inscripción por semestre** (wizard con control prerrequisitos + check mora tesorería)
- **Docentes** (gestión + asignación)
- **Aula Virtual** + integración Zoom (link manual primero, API después)
- **Asistencia**
- Edge function `zoom-create-meeting` (necesita secretos al inicio de la fase)

### Fase 3 — Evaluación
- **Evaluaciones** (crear ítems calificables por cursada)
- **Calificaciones** (captura + cálculo definitiva + promedio acumulado)
- **Biblioteca Digital** (bucket + CRUD)

### Fase 4 — Cierre académico
- **Dashboard Académico** con todos los KPIs reales
- **Reportes** completos (kárdex PDF, retención, aprobación, mora)
- **Certificados automáticos** (trigger + plantilla diploma)
- Verificación pública por QR

## Prerrequisitos antes de Fase 2

1. Subir el **pensum real en Excel o PDF** (materias por semestre con créditos y prerrequisitos) para cargarlo como seed en la migración de Fase 1.
2. Para Zoom API real (Fase 2), necesito que crees una app **Server-to-Server OAuth** en marketplace.zoom.us y me suministres `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` cuando empecemos Fase 2.

## Lo que NO se hace

- No se modifican `cursos`, `materias`, `matriculas` actuales
- No se borra ni migra data existente de Discipulado
- No se cambia el diseño visual ni la navegación principal
- No se sube a producción cada fase sin que valides

¿Apruebas el plan para arrancar con **Fase 1**? Adjunta el pensum si lo tienes a mano para incluirlo en el seed.