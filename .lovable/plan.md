

## Funcionalidad: Tesorería de Ofrendas Casas de Paz (semanal)

### Objetivo
Replicar el formato físico **RE-CO-OC01** dentro del módulo de Grupos como una nueva pestaña **"Tesorería CDP"**. Cada semana se genera automáticamente un consolidado con todas las Casas de Paz, mostrando lo reportado por el líder y permitiendo a Tesorería registrar lo entregado en físico, con observaciones, totales, alertas de mora y descarga en PDF.

### Solución

#### 1. Nueva tabla `tesoreria_ofrendas_cdp`
Una fila por Casa de Paz × semana. Tesorería la edita; el "valor reportado" se calcula en vivo desde `reportes_grupos`.

```
- id (uuid, pk)
- grupo_id (uuid, FK → grupos)
- semana_inicio (date)         ← lunes de la semana
- semana_fin (date)            ← domingo
- valor_entregado (numeric, default 0)
- fecha_entrega (date, nullable)
- observacion (text, nullable)
- registrado_por (uuid)
- created_at / updated_at
- UNIQUE (grupo_id, semana_inicio)
```
RLS: ALL para `admin`, `super_admin`, `pastor`, `tesoreria`.

#### 2. Nueva pestaña "Tesorería CDP" en `GruposPage.tsx`
Solo visible para roles con `tesoreria:manage` (admin, super_admin, pastor, tesoreria).

**Header de la semana**
- Selector "Semana": navegación ◀ semana actual ▶ + selector de fecha.
- Métricas: Total reportado · Total entregado · Diferencia · CDP en mora (no entregado pasada 1 semana).

**Tabla agrupada por Red** (igual al PDF físico)
| RED | CASA DE PAZ | VALOR REPORTADO | VALOR ENTREGADO | FECHA ENTREGA | OBSERVACIÓN | ESTADO |
|-----|-------------|-----------------|-----------------|---------------|-------------|--------|

- **Valor reportado**: suma de `reportes_grupos.ofrenda_casa_paz` para ese grupo cuya `fecha` cae dentro de la semana. Si no hay reporte → "Sin reporte" (gris).
- **Valor entregado / Fecha / Observación**: inputs editables inline (autosave on blur). Crea/upsert en `tesoreria_ofrendas_cdp`.
- **Estado**: badge automático
  - 🟢 `Conciliado` — entregado = reportado
  - 🟡 `Parcial` — entregado < reportado
  - 🔴 `En mora` — sin entrega y semana ya pasó
  - ⚪ `Pendiente` — semana en curso, sin entrega aún
  - ℹ️ `Sin reporte` — el líder no envió reporte
- **Filas de subtotal por Red** + **fila final TOTALES** (reportado / entregado / diferencia).

**Alertas de mora**
- Banner superior cuando hay CDP en mora (semanas anteriores con reporte pero sin entrega): "⚠️ X Casas de Paz tienen ofrendas pendientes de entregar".
- Vista "Mora histórica" (botón → modal): lista de todas las semanas con saldo pendiente por CDP.

**Descarga PDF semanal**
- Botón "Descargar PDF" usa `jsPDF + jspdf-autotable` para generar el documento idéntico al formato físico:
  - Encabezado: logo CMG (de `configuracion_iglesia.logo_url`), código RE-CO-OC01, versión, fecha.
  - Departamento: Tesorería · Encargado: Pastor principal · Fecha: semana.
  - Tabla agrupada por Red con todas las columnas.
  - Fila TOTALES.
  - Pie con "Elaborado por" y "Revisado por" (configurables en `configuracion_iglesia` o pre-llenados con el usuario actual y el pastor principal).

#### 3. Hook `useTesoreriaOfrendasCDP(semanaInicio)` en `src/hooks/useTesoreriaCDP.ts` (nuevo)
- `useTesoreriaSemana(semanaInicio)` — devuelve por cada Casa de Paz: grupo, red, reportado (suma de reportes de la semana), entregado, fecha_entrega, observación, estado calculado.
- `useUpsertTesoreriaCDP()` — upsert sobre `(grupo_id, semana_inicio)`.
- `useTesoreriaMora()` — devuelve registros con `valor_entregado < valor_reportado` o `valor_entregado IS NULL` y `semana_fin < CURRENT_DATE`.

#### 4. Utilidad PDF en `src/lib/exportTesoreriaCDPPdf.ts` (nuevo)
Función `exportTesoreriaSemanalPDF({ semana, filas, totales, configIglesia, elaboradoPor, revisadoPor })` que genera el documento.

#### 5. Indicador en pestaña "Reportes"
En `ReportesGruposPage` (cards de cada reporte): si la ofrenda reportada **no ha sido entregada en tesorería** después de 7 días, mostrar badge rojo "💰 Pendiente entregar a tesorería".

### Archivos afectados

**Nuevos**
- Migración SQL: tabla `tesoreria_ofrendas_cdp` + RLS.
- `src/hooks/useTesoreriaCDP.ts`
- `src/lib/exportTesoreriaCDPPdf.ts`
- `src/components/groups/TesoreriaCDPSection.tsx` — la pestaña completa (header semana, tabla agrupada, banner mora, botón PDF, modal histórico).

**Editados**
- `src/pages/GruposPage.tsx` — agregar tab "Tesorería CDP" (visible solo con permiso).
- `src/lib/permissions.ts` — agregar permiso `tesoreria_cdp:manage` (admin, super_admin, pastor, tesoreria).
- `src/pages/ReportesGruposPage.tsx` — badge "Pendiente entregar" en cards.

### Resultado esperado

Tesorería abre la pestaña **"Tesorería CDP"** y ve, semana a semana, la lista exacta del formato físico: cada Casa de Paz agrupada por Red, con lo reportado por el líder y campos editables para registrar lo entregado, fecha y observación. La tabla totaliza, marca en rojo las CDP en mora y permite descargar el PDF idéntico al RE-CO-OC01 para archivar y firmar. Las alertas de mora aparecen también en el listado de reportes.

