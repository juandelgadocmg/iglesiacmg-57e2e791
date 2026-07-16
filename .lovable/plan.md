
# Rediseño integral — 7 módulos con identidad propia

Cada módulo recibe un **shell propio** (no se recicla el layout de otro) y consume los tokens y primitivas del design system ya creado (`src/pages/_design-system`, `src/components/layout/shell`, `MetricCard`, `StatusBadge`, etc.). Cero tablas tradicionales: todo va en cards, kanban, timeline, calendario, mapa o listas ricas.

---

## 1. Dashboard — "Command Center"
Layout tipo *bento grid* asimétrico (inspiración: Linear + Vercel).
- Hero de bienvenida contextual (hora, sede, saludo) + KPI ring superior (4 métricas vivas).
- Bento: tarjeta grande "Próxima reunión" · widgets pequeños (cumpleaños, alertas, peticiones, tema semana).
- Feed lateral de actividad reciente en tiempo real.
- Accesos rápidos con QuickCreateMenu embebido.

## 2. Personas — "CRM Profile" (LinkedIn + HubSpot)
Dos vistas conectadas:
- **Directorio**: rail de filtros (sede, red, estado) + galería de tarjetas persona con avatar, tags, badges de discipulado; búsqueda semántica arriba.
- **Perfil (rediseño completo de `PersonaPerfilPage`)**:
  - Header **hero** con cover degradado, avatar grande, nombre, roles, chips de estado.
  - Barra sticky de sub-navegación con: `Timeline · Actividad · Seguimiento · Familia · Ministerios · Discipulado · Indicadores · Archivos · Notas · Próximas reuniones · Historial`.
  - Panel principal + rail derecho con **próximas reuniones** e **indicadores clave**.
  - Timeline vertical de hitos, feed de actividad estilo LinkedIn, cards de familia.

## 3. Grupos — "Workspace" (Monday + ClickUp)
Un solo shell con **switcher de vistas**: `Cards · Tabla ligera · Kanban · Mapa · Calendario`.
- Cards: tarjeta por grupo con salud (barra), líder, próxima reunión, asistencia última semana.
- Kanban: columnas por estado (activo, en riesgo, nuevo, cerrado).
- Mapa: Leaflet con clusters (aprovecha hook existente).
- Calendario: reuniones de casas.
- Rail lateral "Salud del grupo" cuando se selecciona uno: miembros, asistencia, última reunión, actividad.

## 4. Casas de Paz
Subvista dentro de Grupos con foco pastoral: mismos componentes de Grupos pero preset filtrado + widget de **tesorería CDP** y **planificación** ya existentes reubicados en cards modulares.

## 5. Discipulado / Academia
Ya rediseñado en Paso 9 (shell LMS). Se reafina para consistencia con nuevos tokens: mismos radios, sombras, tipografías de los otros shells. No se reconstruye desde cero.

## 6. Reuniones — "Agenda" (Google Calendar + Calendly)
Shell dividido en 3 zonas:
- Izquierda: mini-calendario + filtros por tipo/sede.
- Centro: **switcher** `Agenda (lista día/semana) · Calendario mensual · Timeline`.
- Derecha: detalle de reunión seleccionada con **Check-in**, **Asistencia** en vivo (barra + lista) y **Seguimiento** (notas post).

## 7. Actividades / Eventos — "Full Calendar"
Reemplaza tablas por:
- Hero con **eventos destacados** (carrusel de tarjetas grandes con imagen).
- **Calendario completo** mensual arrastrar-para-crear.
- **Agenda** cronológica lateral (próximos 30 días).
- **Timeline** horizontal de la semana en curso.
- Cards de estado (borrador, publicado, cerrado, cancelado).

---

## Convenciones transversales
- Todos los shells usan `AppTopBar` + rail contextual propio del módulo (nunca el sidebar de otro módulo).
- Solo tokens semánticos (`bg-card`, `text-foreground`, `border-border`, gradientes de `--gradient-*`).
- Motion: `framer-motion` para transiciones de vista y entrada de cards (ya está en el proyecto).
- Cero `DataTable` clásico en estos módulos; se sustituye por listas de cards densas cuando se requiera densidad.

## Orden de entrega sugerido (para no bloquear preview)
1. Personas (directorio + perfil).
2. Grupos (5 vistas).
3. Reuniones.
4. Actividades.
5. Dashboard.
6. Refino Discipulado.
7. Casas de Paz (preset sobre Grupos).

## Detalles técnicos
- Nuevos archivos por módulo bajo `src/components/<modulo>/shell/` (ej. `PersonasShell.tsx`, `GruposShell.tsx`, `ReunionesShell.tsx`, `EventosShell.tsx`).
- `PersonaPerfilPage.tsx` se reescribe completo; se preserva toda la lógica de hooks y mutaciones existentes (`useDatabase`, procesos de crecimiento, familia, QR).
- `GruposPage.tsx` orquesta el switcher; las 5 vistas viven en `src/components/grupos/views/*`.
- `EventosPage.tsx` y `ReunionesPage` (nuevo si no existe uno unificado) usan `react-day-picker` (ya instalado) + un timeline propio ligero.
- Ningún cambio en esquema de datos ni RLS.

## Confirmación necesaria antes de implementar
- ¿Arranco por **Personas** (mayor impacto visual) y sigo el orden listado?
- ¿Puedo eliminar los `DataTable` clásicos de estos módulos, o quieres conservar una opción "tabla" como fallback en Grupos?
- ¿"Casas de Paz" debe ser una **subvista de Grupos** (recomendado) o mantener página propia?
