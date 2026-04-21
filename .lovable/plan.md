

## Funcionalidad: Exportación avanzada de Personas con filtro por fecha

### Objetivo
Permitir descargar la información completa de las personas (datos básicos + los 25 procesos de consolidación) en el mismo formato de la plantilla de importación, con la posibilidad de filtrar por **rango de fechas de creación** (año, mes, día) para hacer seguimiento.

### Solución

#### 1. Nuevo componente `ExportPersonasDialog.tsx`
Dialog con:
- **Filtros de fecha de creación**:
  - Selector "Tipo de filtro": Todos / Por año / Por año y mes / Por rango de días
  - Inputs dinámicos según selección (Select de año, Select de mes, dos DatePicker para rango)
- **Vista previa**: muestra cuántas personas coinciden con el filtro
- **Botones**: Exportar a Excel (.xlsx en formato plantilla) / Exportar a PDF (resumen tabular)

#### 2. Lógica de exportación en `src/lib/exportPersonasUtils.ts` (nuevo)
Función `exportPersonasInformeConsolidacion(personas, procesos)`:
- Construye filas con todas las columnas de la plantilla:
  - Datos básicos: `nombres`, `apellidos`, `tipo_persona`, `estado_iglesia`, `vinculacion`, `ministerio`, `red`, `grupo`, `fecha_ingreso`, `invitado_por`, `seguimiento_por`
  - Por cada uno de los 25 procesos: 3 columnas → `(Estado)`, `(Fecha)`, `(Observación)`
- Usa `xlsx` para generar el archivo en el mismo orden de la plantilla original.
- Anchos de columna razonables y encabezado en negrita.

#### 3. Hook auxiliar `usePersonasParaExport(filtros)` en `useDatabase.ts`
- Carga personas con `created_at` dentro del rango.
- Hace JOIN con `persona_procesos` (estado, fecha_completado, observación) y `procesos_crecimiento` (nombre, orden).
- Hace JOIN con `grupos` para `grupo.nombre`.
- Devuelve datos listos para mapear a filas de Excel.

#### 4. Integración en `PersonasPage.tsx`
- Reemplazar el actual `<ExportDropdown>` por un dropdown ampliado con tres opciones:
  - **Exportar lista básica (Excel/PDF)** → comportamiento actual
  - **Exportar Informe de Consolidación (filtrar por fecha)** → abre el nuevo dialog

### Filtros de fecha disponibles
```
- Todos los registros
- Por año:           [2026 ▾]
- Por año y mes:     [2026 ▾] [Abril ▾]
- Por rango días:    [Desde 📅] [Hasta 📅]
```

### Archivos afectados
- **Nuevo**: `src/components/forms/ExportPersonasDialog.tsx` — dialog con filtros y preview.
- **Nuevo**: `src/lib/exportPersonasUtils.ts` — generación del Excel en formato plantilla.
- **Editar**: `src/hooks/useDatabase.ts` — agregar hook que trae personas + procesos + grupo, con filtro de fecha opcional.
- **Editar**: `src/pages/PersonasPage.tsx` — agregar el nuevo botón/opción de exportación.

### Resultado esperado
El usuario puede generar un archivo Excel idéntico a la plantilla de "Informe de Consolidación", filtrando por año/mes/día de creación de la persona, lo que permite hacer seguimiento de bloques específicos de nuevos miembros (p. ej. todos los registrados en abril 2026).

