
# Plan: Gestión de plantillas de certificados con auditoría

Cubre los 4 tipos de certificado: **Líderes CDP, Bautismo, Diplomas de Seminario, Certificados de Academia**. Todo en una sola entrega.

## 1. Base de datos (migración)

### Tabla `cert_templates`
Catálogo de plantillas disponibles por tipo de certificado.

Campos de dominio: `tipo` (enum: `lideres_cdp` | `bautismo` | `seminario_diploma` | `academia`), `nombre`, `descripcion`, `asset_id` (uuid del asset en CDN), `asset_url`, `asset_filename`, `version` (int, autoincrement por tipo), `activo` (bool), `es_default` (bool, solo una por tipo), `preview_url`, `created_by`, `created_by_email`.

Reglas:
- Solo una plantilla puede tener `es_default = true` por `tipo` (índice único parcial).
- Se puede tener varias `activo = true` simultáneas — el usuario elige cuál al descargar.
- RLS: lectura para `authenticated`; escritura solo para `admin` / `super_admin` / `pastor`.

### Tabla `cert_export_log` (auditoría)
Cada descarga de certificado deja una fila.

Campos de dominio: `tipo`, `template_id` (fk → cert_templates), `template_version` (snapshot), `template_asset_id` (snapshot), `persona_id` (nullable, si aplica), `contexto` (jsonb: código, programa, etc.), `user_agent`, `browser_cache_hit` (bool), `actor_user_id`, `actor_email`.

RLS: insert para `authenticated`; lectura solo para admin/pastor.

Semilla inicial: registrar las 2 plantillas actuales (`cert-lideres-cdp.png`, `cert-bautismo.png`) como `version = 1`, `es_default = true`, `activo = true`.

## 2. Configuración (UI nueva)

Nueva pestaña en `ConfiguracionPage.tsx` → **Plantillas de Certificados**.

Componente `src/components/configuracion/CertTemplatesManager.tsx`:
- Lista por tipo de certificado (4 secciones plegables).
- Por cada plantilla: miniatura, nombre, versión, badges (Activa, Por defecto), fecha, autor.
- Acciones: **Subir nueva versión** (usa `lovable-assets` a través de un botón que sube al bucket `cert-templates` y crea la fila), **Marcar como default**, **Activar/Desactivar**, **Vista previa** (modal con imagen a tamaño real), **Eliminar** (solo si no ha sido usada — verifica `cert_export_log`).
- Botón global **Forzar recarga de plantillas**: invalida `queryClient` + añade `?v=<timestamp>` a URLs de preview + limpia entradas de `localStorage` con clave `cert-template-cache-*`.

## 3. Flujo de descarga con selector + vista previa

Nuevo componente reutilizable `src/components/certificados/CertDownloadDialog.tsx`:
- Se abre desde cualquier botón de descarga de certificado.
- Muestra dropdown "Plantilla" (por defecto, la marcada `es_default` del tipo), con las plantillas `activo = true`.
- Panel de vista previa (iframe/img) del PDF resultante con la plantilla elegida, cache-bust con `?v=<version>-<timestamp>`.
- Footer muestra chip: `template_id · v{version} · asset {asset_id.slice(0,8)}`.
- Botón "Forzar recarga" local (refetch de la plantilla ignorando caché del navegador con `cache: "no-store"`).
- Botón "Descargar": genera el PDF, inserta fila en `cert_export_log`, muestra toast con la versión utilizada.

Integraciones:
- `CertificadosSection` (seminario) — reemplaza el `handleDescargar` directo con el dialog.
- Bautismo y Líderes CDP (buscar callers de `cert-bautismo` / `cert-lideres-cdp`) — misma sustitución.
- Academia — mismo dialog.

## 4. Validación de versión / detección de caché viejo

Utilidad `src/lib/certTemplateCache.ts`:
- `fetchTemplateFresh(assetUrl)`: `fetch(url, { cache: "no-store" })`, mide `content-length` y compara con el registrado en `cert_templates.size`. Si difiere → `browser_cache_hit = true` y muestra warning en el dialog: *"Detectamos una versión antigua en caché. Se descargó la última."*
- Al abrir el dialog, hace un pre-check y muestra badge verde "Plantilla actualizada" o amarillo "Caché desactualizado — forzando recarga".

## 5. Historial de exportaciones

Nueva sub-pestaña en Configuración → **Historial de Certificados** (`CertExportHistory.tsx`):
- Tabla filtrable por tipo, plantilla, usuario y rango de fechas.
- Columnas: Fecha, Tipo, Persona, Plantilla (`nombre v{version}`), Asset ID, Usuario, ¿Cache hit?
- Exportar a CSV.
- Vista adicional en el perfil de persona (opcional, dentro del timeline): eventos `certificate_issued` con la versión de plantilla.

## Notas técnicas

- Bucket de storage nuevo `cert-templates` (público de lectura) para poder subir nuevas plantillas desde la UI sin pasar por el CLI de assets.
- Los 2 assets actuales quedan como versión 1 apuntando a su `asset.json` existente (no se rompen).
- Hook `useCertTemplates(tipo)` centraliza la selección de la plantilla default + resolución del asset URL con cache-bust.
- Los PDF generators actuales (`seminarioPdf.ts`, exportadores de bautismo/líderes) reciben la URL de plantilla como parámetro en lugar de importar la constante fija.

## Archivos que se crean/modifican (resumen)

**Nuevos:** migración SQL, `CertTemplatesManager.tsx`, `CertDownloadDialog.tsx`, `CertExportHistory.tsx`, `useCertTemplates.ts`, `certTemplateCache.ts`, `logCertExport.ts`.

**Modificados:** `ConfiguracionPage.tsx` (2 pestañas nuevas), `CertificadosSection.tsx`, exportadores de bautismo/líderes/academia, `seminarioPdf.ts` para aceptar plantilla parametrizada.

¿Apruebas este plan para implementarlo?
