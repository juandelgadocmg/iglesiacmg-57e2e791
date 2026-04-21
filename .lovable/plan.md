

## Mejoras a Tesorería CDP: validación, historial, PDF por fila y alertas de mora

### Objetivo
Cuatro mejoras al módulo "Tesorería CDP":
1. Validar que el valor consignado no difiera del recaudado físico más de un umbral configurable.
2. Permitir reemplazar el soporte aun después de cerrado, con historial de cambios.
3. Botón de PDF por fila cerrada (mini-reporte semanal con comprobante).
4. Contador de días en mora visible en la tabla + alerta automática.

---

### 1. Configuración global del umbral

**Migración SQL** sobre `configuracion_iglesia`:
- `tesoreria_cdp_tolerancia_pct` (numeric, default 0) — % aceptado de diferencia entre consignado y recaudado físico (ej. 2%).
- `tesoreria_cdp_tolerancia_abs` (numeric, default 0) — diferencia absoluta tolerada (ej. $5.000).
- `tesoreria_cdp_dias_mora` (integer, default 7) — días después del cierre de semana para marcar mora.

**UI**: en `ConfiguracionPage.tsx`, dentro de la pestaña de "General" (o nueva sub-sección "Tesorería"), tres inputs: tolerancia %, tolerancia absoluta, días para mora.

### 2. Historial de soportes de consignación

**Nueva tabla `tesoreria_consignacion_historial`**:
```
- id (uuid pk)
- registro_id (uuid → tesoreria_ofrendas_cdp)
- soporte_url (text)
- valor_consignado (numeric)
- fecha_consignacion (date)
- motivo_cambio (text, nullable)
- cambiado_por (uuid)
- created_at (timestamp)
```
RLS: ALL para `admin`, `super_admin`, `pastor`, `tesoreria`.

**Hooks** en `useTesoreriaCDP.ts`:
- `useReemplazarSoporteConsignacion()` — sube nuevo archivo, registra fila en historial con el soporte anterior, actualiza `tesoreria_ofrendas_cdp.soporte_consignacion_url`.
- `useHistorialConsignacion(registroId)` — devuelve cambios ordenados.

### 3. Validación en el diálogo de consignación

En `ConsignacionDialog` (`TesoreriaCDPSection.tsx`):
- Leer tolerancias desde `useConfiguracion`.
- Calcular diferencia absoluta y porcentual entre `valor_consignado` y `valor_entregado`.
- Si está dentro de tolerancia → solo aviso amarillo informativo.
- Si excede → aviso rojo bloqueante: "La diferencia ($X / Y%) supera la tolerancia configurada (Z% / $W). Ajusta el valor o solicita autorización." y el botón "Cerrar proceso" queda deshabilitado.
- Bypass solo para `admin`/`super_admin` con checkbox "Autorizar diferencia con justificación" + textarea obligatoria, que se guarda en `observacion`.

### 4. Reemplazo de soporte con proceso cerrado

En `FilaEditable`, cuando `cerrado === true`, además del enlace "Ver soporte" agregar:
- Botón "Reemplazar soporte" (solo `admin`, `pastor`, `tesoreria`) → abre `ReemplazarSoporteDialog` (nuevo, en el mismo archivo) con: input file, motivo (textarea obligatoria) y botón "Subir y registrar cambio".
- Al confirmar, llama a `useReemplazarSoporteConsignacion`, que mantiene el estado `Cerrado` pero deja trazabilidad.
- Botón "Ver historial" → modal con tabla del historial completo (fecha, valor, soporte, motivo, usuario).

### 5. PDF por fila cerrada

En `FilaEditable`, cuando `cerrado === true` agregar botón "PDF" junto a "Ver soporte" → llama a una nueva función `exportFilaSemanalPDF` en `src/lib/exportTesoreriaCDPPdf.ts`:
- Encabezado igual al actual (logo, código RE-CO-OC01, semana).
- Sección de la Casa de Paz: red, nombre, líder.
- Bloque de datos: recaudado físico, valor entregado, valor consignado, fecha consignación, observación.
- Si el soporte es imagen → la embebe debajo (escalada). Si es PDF → línea con URL/QR de acceso.
- Pie con firmas (ELABORADO POR / REVISADO POR).
- Filename: `Consignacion_{red}_{grupo}_{semana}.pdf`.

### 6. Contador de días en mora + alertas

**En `useTesoreriaSemana` y `useTesoreriaMora`**: leer `tesoreria_cdp_dias_mora` de configuración, calcular para cada fila no-cerrada:
- `dias_mora = max(0, hoy − semana_fin − dias_configurados)`.
- Estado "En mora" se activa solo si `dias_mora > 0` (en lugar del cálculo actual fijo de 7 días).

**En la tabla** (`FilaEditable`):
- Si `dias_mora > 0` → debajo del badge de estado mostrar chip rojo: `⏱ {n} días en mora`.
- En la columna "Estado" la celda toma fondo `destructive/10` cuando hay mora.

**Banner de mora histórica** (ya existente): añadir columna "Días" en la tabla del modal, con el conteo desde el vencimiento.

**Alerta automática (in-app)**: en `daily-notifications` edge function (ya existente para cumpleaños/eventos) añadir bloque que cada día detecte CDP en mora y cree una notificación dirigida a usuarios con rol `tesoreria` / `pastor` / `admin`. Texto: "X Casas de Paz llevan más de N días sin registrar consignación".

---

### Archivos afectados

**Nuevos**
- Migración SQL: columnas en `configuracion_iglesia` + tabla `tesoreria_consignacion_historial` + RLS.

**Editados**
- `src/hooks/useTesoreriaCDP.ts` — hooks de historial + reemplazo, lectura de tolerancias y días, recálculo de mora.
- `src/components/groups/TesoreriaCDPSection.tsx` — validación en diálogo, botones reemplazar/PDF/historial por fila, columna días de mora, dialogs nuevos.
- `src/lib/exportTesoreriaCDPPdf.ts` — nueva función `exportFilaSemanalPDF` con embebido de imagen del comprobante.
- `src/pages/ConfiguracionPage.tsx` — sección "Tesorería CDP" con 3 inputs.
- `src/hooks/useConfiguracion.ts` — sin cambios estructurales, solo se consumen los nuevos campos (los tipos vienen de `types.ts` autogenerado).
- `supabase/functions/daily-notifications/index.ts` — bloque de detección de mora.

### Resultado esperado

- Al consignar, el sistema bloquea el cierre si la diferencia excede el rango configurado (con override autorizado para admin con justificación).
- En filas cerradas, Tesorería puede reemplazar el comprobante dejando rastro en historial, descargar un PDF individual del proceso (con comprobante embebido) y revisar todos los cambios.
- La tabla muestra "X días en mora" junto al estado, y diariamente se generan alertas para los responsables.
- Todos los umbrales y plazos se ajustan desde Configuración sin tocar código.

