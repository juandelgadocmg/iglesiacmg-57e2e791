

## Sincronización automática Academia → Crecimiento al finalizar materias

### Problema actual

Hoy la sincronización con `persona_procesos` solo ocurre cuando un maestro guarda calificaciones desde la grilla, **únicamente para escuelas de Discipulado** y solo para los estudiantes con notas escritas en ese momento. Cuando se pulsa **"Finalizar materia"** (que cambia `materias.estado` a `Finalizada`), no se ejecuta ningún recálculo, por lo que el módulo de Personas queda desactualizado para muchos estudiantes.

### Solución

Disparar la sincronización completa en el momento exacto en que la materia se cierra, usando el `nota_final` consolidado de cada matrícula (no solo lo que esté en pantalla). La sincronización aplicará tanto a Discipulado como a Seminario Bíblico.

#### 1. Nueva función `syncMateriaToCrecimiento(materiaId)` en `src/hooks/useAcademia.ts`

Reutilizable desde la UI y desde futuros disparadores. Lógica:
1. Cargar la materia + escuela + período.
2. Cargar todas las matrículas de esa materia con `persona_id`, `nota_final`, `estado` (excluyendo `Retirado`).
3. Si la matrícula no tiene `nota_final`, calcularlo en vivo a partir de `calificaciones` × `items_calificables.porcentaje` × `cortes_academicos.porcentaje` (mismo cálculo que ya hace `HistorialCalificacionesSection`). Persistir el resultado en `matriculas.nota_final` y marcar `estado = 'Completado'` o `'Reprobado'` según `>= 3`.
4. Buscar el `proceso_crecimiento` que coincida con el nombre de la materia (match igual al actual, case-insensitive con `includes` bidireccional). Si no hay coincidencia → no sincroniza ese proceso pero igual cierra la materia.
5. Para cada estudiante:
   - `nota_final >= 3` → upsert en `persona_procesos` con `estado = 'Realizado'`, `fecha_completado = today`, `observacion = 'Finalizado por cierre de materia: {nombre}'`.
   - `nota_final < 3` (reprobado) → no se marca el hito (queda "No Realizado").
   - Sin nota → se omite y se reporta en el toast ("N estudiantes sin nota, no sincronizados").
6. Invalidar queries: `["persona_procesos"]`, `["personas"]`, `["matriculas"]`.

Devuelve un resumen `{ sincronizados, sinNota, sinProcesoMatch, procesoNombre }` para mostrar en el toast.

#### 2. Disparar la sincronización al "Finalizar materia"

En `src/pages/AcademiaPage.tsx` (líneas 1770-1793), reemplazar la llamada actual:
```
await updateMateria.mutateAsync({ id: m.id, estado: "Finalizada" });
const resumen = await syncMateriaToCrecimiento(m.id);
toast.success(
  `Materia finalizada · ${resumen.sincronizados} hito(s) actualizado(s)` +
  (resumen.sinNota ? ` · ${resumen.sinNota} sin nota` : "") +
  (!resumen.procesoNombre ? " · Sin proceso de crecimiento asociado" : "")
);
```

Cambiar el `confirm()` para advertir el efecto:
> "¿Finalizar la materia '{nombre}'? Se cerrará para edición y los estudiantes aprobados (≥3) verán su hito de crecimiento marcado como Finalizado."

#### 3. Reabrir materia → revertir hitos

En el botón "Reabrir" (línea 1782-1792), después de `updateMateria`, llamar a una contraparte `revertMateriaFromCrecimiento(materiaId)` que:
- Busca el proceso asociado.
- Para cada matrícula aprobada, si su `persona_procesos.observacion` empieza con `"Finalizado por cierre de materia: {nombre}"` → eliminar la fila (vuelve a "No Realizado"). Esto evita borrar hitos finalizados manualmente desde el perfil de la persona.

#### 4. Sincronización también desde la grilla (mejora consistencia)

Quitar el filtro "solo Discipulado" en `syncWithGrowthModule` (línea 1144) — Seminario Bíblico también debe sincronizar cuando hay match de nombre. Reemplazar la función actual por una llamada a `syncMateriaToCrecimiento(selectedMateria)` después de `bulkUpsert.mutateAsync(records)` para no duplicar lógica.

#### 5. Indicador en UI

En las cards de materia (línea 1722) añadir un mini-badge cuando la materia está finalizada y existe un `proceso_crecimiento` con el mismo nombre:
`🎯 Sincronizado con: {nombre del proceso}`.

### Archivos afectados

**Editados**
- `src/hooks/useAcademia.ts` — exportar `syncMateriaToCrecimiento(materiaId)` y `revertMateriaFromCrecimiento(materiaId)`. Lógica de cálculo de `nota_final` consolidado.
- `src/pages/AcademiaPage.tsx` — invocar las funciones en los botones Finalizar/Reabrir, ampliar el `confirm()`, mejorar mensajes de toast, refactorizar `syncWithGrowthModule` para reutilizar la nueva función y eliminar restricción a Discipulado, añadir badge de sincronización.

**Sin cambios**
- Esquema de base de datos. La lógica usa las tablas existentes: `materias`, `matriculas`, `calificaciones`, `items_calificables`, `cortes_academicos`, `procesos_crecimiento`, `persona_procesos`.

### Resultado esperado

Al pulsar **"Finalizar"** en una materia de Academia, el sistema:
1. Calcula y persiste `nota_final` de cada matrícula que aún no la tenga.
2. Marca como **Finalizado** el hito de crecimiento correspondiente (mismo nombre) para todos los estudiantes con promedio ≥ 3, con la fecha de hoy.
3. Muestra un resumen claro: cuántos hitos se actualizaron, cuántos quedaron sin nota, si hubo proceso de crecimiento asociado.
4. Si la materia se reabre, se revierten únicamente los hitos generados por ese cierre, sin afectar marcaciones manuales.

La sincronización es ahora **inmediata, completa y bidireccional**, eliminando la necesidad de re-guardar calificaciones para que el módulo de Personas refleje el avance espiritual.

