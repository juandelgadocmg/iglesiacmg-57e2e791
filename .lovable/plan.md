# Plan: mejoras UX/seguridad en Mensajes y Eventos

## 1. Notificación accesible al restaurar foco (Back/Forward)

- Crear `src/components/shared/LiveAnnouncer.tsx`: región `role="status" aria-live="polite" aria-atomic="true"` fija fuera de pantalla (`sr-only`), con hook `useAnnounce()` que expone `announce(msg)`.
- Montarla una sola vez en `AppLayout.tsx`.
- En `MensajesPage.tsx`, cuando el `useEffect([selected, accumulated.length])` reenfoca la fila del hilo tras Back/Forward, disparar `announce("Hilo restaurado: <asunto>")`.
- En `MensajeThreadView.tsx`, al enfocar mensaje vía `?m=<id>`, `announce("Mensaje restaurado de <autor>, <fecha>")`.
- En `EventosPage.tsx`, si al montar la ruta hay parámetros de estado (filtros/scroll) y se restauran, `announce("Vista de eventos restaurada")`.
- Solo se anuncia cuando el trigger es `POP` (Back/Forward), usando `useNavigationType()` de react-router, para no ruido en navegación normal.

## 2. Permisos por rol para acciones sensibles

- Extender `src/lib/permissions.ts` con capacidades:
  - `share_link` (compartir enlace / QR)
  - `download_qr` (descargar QR PNG)
  - `view_audit` (acceder a auditoría / historial)
- Mapeo por rol reutilizando `useCan(cap)`:
  - `admin`, `pastor`, `lider_red`: todas
  - `lider`, `maestro`, `consolidador`, `tesoreria`: `share_link` sí, `download_qr` sí, `view_audit` no
  - Roles restantes / invitado: ninguna
- `ShareLinkButton.tsx`: aceptar prop opcional `capability` (default `share_link`); si `!useCan(cap)` no renderiza el botón. Botón "Descargar PNG" dentro del `QrPanel` se oculta si `!useCan("download_qr")`.
- Nuevo `RecentSharesPanel` (ver §3) y cualquier vista de auditoría existente: gate con `useCan("view_audit")`.

## 3. Historial de enlaces compartidos recientes

- Almacenamiento cliente en `localStorage` clave `doxa:recent-shares:v1`, máx. 20 entradas, dedupe por URL, ordenado por `ts` desc.
- Nueva utilidad `src/lib/recentShares.ts`: `addShare({ scope: "mensajes" | "eventos", label, url, ts })`, `listShares(scope?)`, `removeShare(url)`, `clearShares(scope?)` + evento `storage` para sincronía multipestaña.
- `ShareLinkButton.tsx`: al copiar o generar QR, invocar `addShare` con `scope` (prop nuevo) y `label` (prop nuevo, ej. asunto del hilo, título del evento, o "Vista actual" por defecto).
- Nuevo `src/components/shared/RecentSharesPanel.tsx`: `Popover` con lista (icono, label, timestamp relativo, botón abrir, botón copiar, botón quitar) y "Vaciar historial". Icono en toolbar: `History`.
- Al hacer "Abrir": si es misma-origin → `navigate(pathname+search+hash)`; si no, `window.open`.
- Integrado en `MensajesPage.tsx` (barra superior, junto a `ShareLinkButton` y `ScanQrLinkButton`) filtrando por `scope="mensajes"`, y en `EventosPage.tsx` con `scope="eventos"`.
- Gate con `useCan("share_link")`.

## 4. Escáner QR con reintentos automáticos y pausa

Refactor de `src/components/shared/ScanQrLinkButton.tsx`:

- Estados: `idle | starting | scanning | paused | error | success`.
- Reintentos automáticos: si `Html5Qrcode.start()` rechaza (permiso denegado excluido) o el callback de error dispara N veces consecutivas sin lectura en ~8 s, reintentar hasta 3 veces con backoff (1s, 2s, 4s). Se cancelan si el usuario pausa o cierra.
- Botón "Pausar" / "Reanudar" (usa `pause(true)` / `resume()` de html5-qrcode). Icono cambia `Pause` ↔ `Play`.
- Botón "Reintentar" visible en estado `error`.
- Indicador visual: badge de estado ("Buscando…", "En pausa", "Reintentando 2/3", "Baja luz — sostén firme").
- Tip de iluminación cuando pasan >5s sin lectura exitosa.
- Cleanup robusto en cierre del diálogo: `stop().catch(()=>{})` y `clear()` protegidos.

## 5. Modo presentación

- Nuevo hook `src/hooks/usePresentationMode.ts`: booleano persistido en `localStorage` clave `doxa:presentation:<scope>`; toggle expuesto.
- Cuando activo: agrega clase `data-presentation` al contenedor raíz de la página; en CSS (`index.css`) definir bajo `[data-presentation="true"]`:
  - `--text-base: 1.25rem`, headings +20%
  - Spacing +20% en `.presentation-density` wrappers
  - Contraste reforzado (usar tokens existentes `text-foreground`)
  - Ocultar chrome no esencial (mini-filtros, contadores densos) vía `.presentation-hide`
- Botón toggle "Modo presentación" (icono `Projector`) en toolbar de `EventosPage.tsx` y `MensajesPage.tsx`, con `aria-pressed` y tooltip. Atajo teclado `Shift+P`.
- Solo afecta la página actual (scope), no global.

## Notas técnicas

- No cambios de schema ni backend.
- Reutiliza tokens del design system; no colores arbitrarios.
- Todos los popovers/dialogos usan primitivas shadcn existentes.
- `LiveAnnouncer` es la única fuente global; hooks locales usan su contexto.
- Verificación: `tsgo --noEmit` y screenshot Playwright de `/mensajes` y `/eventos` con y sin modo presentación.

## Archivos nuevos

- `src/components/shared/LiveAnnouncer.tsx`
- `src/components/shared/RecentSharesPanel.tsx`
- `src/lib/recentShares.ts`
- `src/hooks/usePresentationMode.ts`

## Archivos modificados

- `src/lib/permissions.ts`
- `src/components/shared/ShareLinkButton.tsx`
- `src/components/shared/ScanQrLinkButton.tsx`
- `src/layouts/AppLayout.tsx` (o equivalente que renderiza `<Outlet />`)
- `src/pages/MensajesPage.tsx`
- `src/pages/EventosPage.tsx`
- `src/components/mensajes/MensajeThreadView.tsx`
- `src/index.css` (reglas `[data-presentation="true"]`)
