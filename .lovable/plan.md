## Alcance

Elevar el "Tema de la Semana" de un simple campo en `configuracion_iglesia` a una entidad versionada con vigencia, historial, auditoría y una UX pulida en Configuración.

---

## 1. Backend (migración única)

**Nueva tabla `public.tema_semana_versiones`** — cada fila es una versión publicada/programada.

Campos de dominio:
- `titulo`, `descripcion`, `url` (link opcional), `pdf_url` (PDF cargado opcional)
- `fecha_inicio date`, `fecha_fin date` (rango de vigencia, ambos opcionales — sin fecha = vigente indefinidamente)
- `estado` (`activo` | `revertido`) — borrado lógico para conservar historial
- `created_by uuid` (auth.users), `created_by_email text` (snapshot para historial legible)
- `parent_version_id uuid` (si se creó revirtiendo otra)

**GRANTs**: authenticated (RUD por rol admin/pastor, insert por rol admin/pastor), service_role. Sin acceso anon.

**RLS**:
- SELECT: cualquier usuario autenticado (para que el dashboard lo lea).
- INSERT/UPDATE/DELETE: solo `admin`, `super_admin`, `pastor`.

**Trigger de auditoría** `audit_tema_semana` → reusa `audit_sensitive_change()` para poblar `security_audit_log` en cada insert/update/delete (cubre subida, reemplazo y borrado).

**Función RPC `tema_semana_vigente()`** — `SECURITY DEFINER`, devuelve la versión activa cuya vigencia cubre `CURRENT_DATE`; si hay empate, la de `fecha_inicio` más reciente; si ninguna tiene rango, la última creada. Fallback: valores actuales de `configuracion_iglesia.tema_semana_*` para no romper instalaciones existentes.

**Función RPC `tema_semana_revertir(_version_id uuid)`** — `SECURITY DEFINER`, valida rol admin/pastor, clona la versión indicada como una nueva fila con `parent_version_id`, la deja vigente desde `CURRENT_DATE` y marca la versión anterior con `fecha_fin = CURRENT_DATE - 1`.

Los campos existentes `tema_semana_*` en `configuracion_iglesia` se conservan como respaldo/legacy; no se eliminan.

---

## 2. Frontend — Configuración (`ConfiguracionPage.tsx` + nuevo componente)

Refactor de la tarjeta "Tema de la Semana" a un componente dedicado `TemaSemanaManager.tsx` con dos secciones:

### 2.1 Editor de nueva versión
- Inputs de título, descripción, URL de enlace.
- **Datepicker rango** (shadcn) para `fecha_inicio` / `fecha_fin` (ambos opcionales, con presets: "Esta semana", "Próximo domingo → sábado", "Sin fecha").
- **Dropzone PDF** (drag & drop + click) usando el `<input type=file>` nativo con eventos `onDragOver`/`onDrop`:
  - Estado visual: idle, dragging, uploading (barra de progreso desde `supabase.storage.upload` — se emula con estados intermedios), success, error.
  - Validaciones con toast + mensaje inline: solo `application/pdf`, máx. 10 MB — mensajes claros ("El archivo es de 12,4 MB, excede el máximo de 10 MB").
- **Preview de la primera página** del PDF usando `pdfjs-dist` (ya disponible como transitiva de dependencias — si no, se agrega `pdfjs-dist`) renderizado en un `<canvas>` a 160×220 px antes de guardar.
- **Botón "Eliminar PDF"** que limpia el campo y vuelve al PDF básico generado por jsPDF; toast confirmando.
- **Botón "Publicar versión"** → INSERT en `tema_semana_versiones` (rol admin/pastor).

### 2.2 Historial
Tabla/lista con columnas: título, descripción (resumen), vigencia (rango), autor (email/nombre), fecha de publicación, badge de estado (`vigente`, `programada`, `expirada`, `revertida`), acciones:
- Ver PDF (si tiene)
- **Revertir** → llama `tema_semana_revertir(id)` con confirmación; toast + refresh.

---

## 3. Frontend — Dashboard y HoyPage

`useTemaSemanaVigente()` — nuevo hook que consulta la RPC y cachea con react-query. Se pasa a `DashboardTemaSemana` en lugar de leer `config?.tema_semana_*` directamente. La tarjeta sigue con el mismo estilo teal actual; muestra un pequeño badge "Vigente hasta DD/MMM" si hay `fecha_fin`.

Si no hay versión activa: cae a los valores legacy de `configuracion_iglesia` (compatibilidad hacia atrás).

---

## 4. Auditoría

- El trigger `audit_tema_semana` cubre insert/update/delete → `security_audit_log` con `table_name='tema_semana_versiones'`, actor, cambios diff.
- Adicionalmente, la subida del PDF a Storage invoca `public.log_storage_event('banners', path, 'UPLOAD', {section:'tema_semana'})` y el borrado del PDF `... 'DELETE' ...` — ya existe la función.
- Ambos quedan consultables en Configuración → Auditoría (si existe vista) o vía la tabla `security_audit_log`.

---

## Archivos afectados

| Ruta | Cambio |
|---|---|
| migración SQL | nueva tabla, RPCs, trigger |
| `src/hooks/useTemaSemana.ts` | **nuevo** — hooks CRUD + `useTemaSemanaVigente` |
| `src/components/configuracion/TemaSemanaManager.tsx` | **nuevo** — editor + historial + dropzone + preview |
| `src/components/configuracion/TemaSemanaPdfPreview.tsx` | **nuevo** — canvas con `pdfjs-dist` |
| `src/pages/ConfiguracionPage.tsx` | reemplaza la Card actual por `<TemaSemanaManager />` |
| `src/components/dashboard/DashboardTemaSemana.tsx` | añade badge de vigencia |
| `src/pages/Dashboard.tsx`, `src/pages/HoyPage.tsx` | consumen `useTemaSemanaVigente` |
| `package.json` | agrega `pdfjs-dist` si no está |

---

## Consideraciones técnicas

- `pdfjs-dist` requiere configurar el worker: se sirve como asset estático (`import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`).
- La reversión NO borra la versión antigua ni el PDF en Storage — solo cierra su vigencia; así el historial y los links previos siguen accesibles.
- Sin cambios en el bucket: se sigue usando `banners/tema-semana/`.
- Compatibilidad: la primera vez que se publique una versión, si `configuracion_iglesia.tema_semana_*` tenía datos, se propone (opcional) importarlos como versión inicial — se hará automáticamente en la migración con `INSERT ... SELECT` cuando alguno de los campos no sea nulo.
