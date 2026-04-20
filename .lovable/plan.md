

## Problema

En el módulo de Academia faltan capacidades clave de gestión:

1. **Períodos**: solo se pueden cerrar/reabrir desde la tarjeta. No hay edición completa (nombre, fechas, fechas de matrícula), ni eliminar, ni duplicar (clonando el pensum).
2. **Cierre de período**: aunque se cierre, `MatriculaFormDialog` deja matricular en períodos cerrados.
3. **Historial de matrículas**: solo permite editar la nota final inline. No hay editar estado/materia ni eliminar la matrícula.

## Solución

### 1. Gestión completa de Períodos

**`PeriodoFormDialog`** — convertirlo en componente reutilizable para crear **y editar**:
- Recibe prop opcional `periodo` (si viene → modo edición, usa `useUpdatePeriodo`).
- Misma estructura de campos (nombre, estado, fechas período, fechas matrícula).

**`PeriodosSection`** (tarjeta de período) — agregar menú `MoreVertical` con:
- ✏️ **Editar** → abre `PeriodoFormDialog` en modo edición.
- 📋 **Duplicar (con pensum)** → crea período nuevo + clona todas las `materias` y `cortes_academicos` del período origen.
- 🗑️ **Eliminar** → `DeleteConfirmDialog`. Verifica que no tenga matrículas activas; si tiene, muestra error claro.

**Nuevo hook `useDuplicatePeriodo`** en `useAcademia.ts`:
1. Inserta nuevo `periodos_academicos` (nombre = "Copia de …" o el que ingrese el usuario).
2. Obtiene `materias` del período origen → re-inserta con el nuevo `periodo_id` (preservando maestro_id, aula_id, código, configuración, cupos).
3. Obtiene `cortes_academicos` del período origen → re-inserta con el nuevo `periodo_id`.
4. **No** clona matrículas, calificaciones ni asistencia (datos del estudiante son por período).

### 2. Bloqueo de matrículas en períodos cerrados

**`MatriculaFormDialog`**:
- Filtrar el select de períodos para mostrar solo los `Abierto` (o marcar los cerrados como `disabled` con etiqueta "Cerrado").
- Validación adicional en `onSubmit`: si el período seleccionado está `Cerrado`, mostrar `toast.error("Este período está cerrado, no admite nuevas matrículas")` y abortar.
- En `PeriodoDetailView`: ocultar el botón "Matricular" del header cuando `periodo.estado === "Cerrado"` (ya tiene la lógica de finalizar/reabrir).

### 3. Editar y eliminar matrícula en Historial

**`useAcademia.ts`** — agregar `useDeleteMatricula` (delete por id con invalidación de `matriculas`, `matriculas-all`, `calificaciones-grid`).

**`HistorialMatriculasSection`** — agregar columna "Acciones" con:
- ✏️ **Editar matrícula** → diálogo modal con: estado (Activo/Aprobó/No Aprobó/Retirado), nota final, materia (select de materias del mismo período). Usa `useUpdateMatricula` extendido para aceptar `materia_id`.
- 🗑️ **Eliminar** → `DeleteConfirmDialog`. Advertencia: "Eliminar la matrícula también eliminará las calificaciones asociadas".

**`useUpdateMatricula`** — extender el tipo para aceptar `materia_id` opcional.

## Archivos afectados

- `src/components/forms/PeriodoFormDialog.tsx` — soporte modo edición.
- `src/pages/AcademiaPage.tsx`:
  - `PeriodosSection`: menú de acciones (editar / duplicar / eliminar) en cada tarjeta.
  - `HistorialMatriculasSection`: columna acciones + diálogo de edición + eliminar.
  - `MatriculaFormDialog` (uso): nada.
- `src/components/forms/MatriculaFormDialog.tsx` — filtrar/desactivar períodos cerrados + validación en submit.
- `src/hooks/useAcademia.ts`:
  - `useDuplicatePeriodo` (nuevo).
  - `useDeleteMatricula` (nuevo).
  - `useUpdateMatricula` extender tipo con `materia_id`.

## Resultado esperado

- Cada tarjeta de período ofrece editar, duplicar (arrastrando pensum y cortes) y eliminar.
- Los períodos cerrados aparecen deshabilitados al matricular y bloqueados con mensaje claro.
- El historial de matrículas permite editar estado/nota/materia y eliminar registros, con confirmación.

