
# DOXA Design System — Plan de construcción

Objetivo: crear el **ADN visual y de componentes** de DOXA como una capa reutilizable, antes de rediseñar ninguna pantalla. Cero cambios en `src/pages/**`. Todo vive en `src/design-system/**`, `src/index.css` y `tailwind.config.ts`.

## Principios rectores

- **Enterprise SaaS**, no dashboard genérico. Inspiración: Linear (densidad + jerarquía), Stripe (tipografía + tablas), Vercel (neutros + acento), Notion (calma tipográfica), HubSpot (data-density), Clerk/Supabase (formularios).
- **Un solo lenguaje**: cada pantalla futura consume componentes de `@/design-system/*`. Prohibido reinventar variantes locales.
- **Tokens semánticos HSL** en `index.css`. Nada de `text-white`, `bg-black`, hex sueltos.
- **Modo claro + oscuro** desde el día 1.
- **Densidad configurable** (`comfortable` / `compact`) vía atributo en `<html>`.

## 1. Fundaciones (tokens)

Archivos: `src/index.css`, `tailwind.config.ts`, `src/design-system/tokens.ts`.

### 1.1 Color

Paleta neutra "graphite" + acento "doxa-blue" + estados. Todo en HSL.

- **Neutros**: `--surface-0..4` (fondos escalonados), `--border-subtle`, `--border`, `--border-strong`, `--fg-default`, `--fg-muted`, `--fg-subtle`, `--fg-onAccent`.
- **Marca**: `--brand` (azul profundo #3D5AFE-ish), `--brand-hover`, `--brand-active`, `--brand-soft`, `--brand-contrast`.
- **Semánticos**: `success`, `warning`, `danger`, `info` con variantes `-soft`, `-fg`, `-border`.
- **Data-viz**: `--chart-1..8` (secuencia perceptualmente uniforme, no arcoíris genérico).
- **Overlays**: `--scrim`, `--glass`.

### 1.2 Tipografía

- **Display / UI**: `Geist` (o `Inter Display` como fallback) — pareja moderna tipo Vercel/Linear.
- **Mono**: `Geist Mono` — para IDs, código, valores tabulares.
- Escala tipográfica modular (1.125): `xs 12 / sm 13 / base 14 / md 15 / lg 17 / xl 20 / 2xl 24 / 3xl 30 / 4xl 38 / display 48`.
- Line-height + tracking definidos por rol (`ui`, `body`, `heading`, `numeric`).

### 1.3 Espaciado y radios

- Escala base 4px: `0, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24`.
- **Radios**: `xs 4 / sm 6 / md 8 / lg 12 / xl 16 / 2xl 20 / pill 999`. Default de superficies = `lg`.

### 1.4 Elevación y sombras

Cinco niveles: `elev-0` plano, `elev-1` card, `elev-2` menú, `elev-3` popover, `elev-4` modal, `elev-5` command palette. Cada una con variante para dark mode (sombras + ring sutil).

### 1.5 Estados

Tokens explícitos para `hover`, `focus-visible`, `active`, `disabled`, `selected`, `loading` — aplicables vía data-attrs y `focus-visible:ring-[--ring-focus]`.

### 1.6 Motion

- Duraciones: `fast 120ms`, `base 180ms`, `slow 240ms`, `page 320ms`.
- Easings: `standard`, `emphasized`, `exit`. Presets `framer-motion` en `motion.ts`.

## 2. Librería de componentes

Ruta: `src/design-system/components/**`. Cada componente exporta variantes vía `cva`, tipos TS y ejemplos.

### Primitivos
Button (5 variantes × 4 tamaños), IconButton, Link, Badge, Chip, Tag, Kbd, Divider, Skeleton, Spinner, ProgressBar, ProgressRing, Avatar, AvatarGroup, StatusDot, Tooltip.

### Formularios
Input, Textarea, NumberInput, PasswordInput, SearchInput, Select, MultiSelect, Combobox, DatePicker, DateRangePicker, TimePicker, Switch, Checkbox, RadioGroup, Slider, FileDropzone, FormField (label + hint + error + description), Fieldset, InlineEdit, FormWizard (stepper horizontal + vertical).

### Navegación
Sidebar (colapsable, grupos, activo, badge de conteo), TopNav (con search + user menu + notifs), Breadcrumbs, Tabs (underline / pill / segmented), CommandPalette (⌘K, grupos, footer con atajos), ContextMenu, Pagination.

### Superficies
Card, SectionCard, KpiCard (valor + delta + sparkline slot), StatCard, EmptyState (icono + título + descripción + acción), Callout / Alert (4 tonos), Banner, Panel, Drawer, Modal / Dialog, Sheet, Popover.

### Data
DataTable premium (sticky header, column resize, sort, filter chips, row selection, bulk toolbar, density toggle, virtualización opcional, empty/loading/error), Toolbar, FilterBar, ColumnPicker, ExportMenu, KanbanBoard (columnas + cards + WIP + drag handle visual), Timeline, ActivityFeed, NotificationCard, Calendar (mes / semana / día), Widget shell.

### Feedback
Toast (sonner ya está — envolver con variantes semánticas), ConfirmDialog, InlineAlert, LoadingOverlay, ErrorBoundary visual.

### Charts (envoltura sobre recharts)
`AreaChartCard`, `BarChartCard`, `LineChartCard`, `DonutChartCard`, `SparkLine`, `TrendDelta`. Todos leen tokens `--chart-*` y comparten tooltip/legend estandarizados.

## 3. Estructura de carpetas

```text
src/
  design-system/
    tokens.ts                  # export TS de tokens (colores, spacing, motion)
    motion.ts                  # presets framer-motion
    index.ts                   # barrel: export * from componentes
    primitives/
      Button.tsx  Badge.tsx  Chip.tsx  Avatar.tsx  ...
    forms/
      Input.tsx  Select.tsx  MultiSelect.tsx  FormField.tsx  Wizard.tsx  ...
    nav/
      Sidebar.tsx  TopNav.tsx  Breadcrumbs.tsx  Tabs.tsx  CommandPalette.tsx
    surfaces/
      Card.tsx  KpiCard.tsx  EmptyState.tsx  Modal.tsx  Drawer.tsx  Popover.tsx
    data/
      DataTable.tsx  FilterBar.tsx  Kanban.tsx  Timeline.tsx  ActivityFeed.tsx
      NotificationCard.tsx  Calendar.tsx  Widget.tsx
    charts/
      AreaChartCard.tsx  BarChartCard.tsx  DonutChartCard.tsx  SparkLine.tsx
    feedback/
      Toast.tsx  ConfirmDialog.tsx  InlineAlert.tsx
  pages/
    _design-system/
      DesignSystemPage.tsx     # ruta interna /design-system para verlo todo
```

- Los componentes existentes de shadcn en `src/components/ui/**` **no se borran**. El nuevo sistema los envuelve/compone; migrar pantallas es tarea posterior.
- Se añade una ruta interna `/design-system` (solo para revisión) que renderiza cada sección como storybook ligero. No aparece en el sidebar de usuarios finales.

## 4. Entregables de esta fase

1. Tokens completos en `index.css` + `tailwind.config.ts` + `tokens.ts`.
2. Todos los componentes listados, con variantes, estados y modo oscuro.
3. Página `/design-system` navegable por secciones (Foundations, Primitives, Forms, Navigation, Surfaces, Data, Feedback, Charts).
4. README corto en `src/design-system/README.md` explicando cómo consumirlo.
5. **Cero cambios** en pantallas actuales, hooks, migraciones o lógica de negocio.

## 5. Fuera de alcance (fases siguientes)

- Migración de `Dashboard`, `PersonaPerfil`, `Personas`, `Finanzas`, `Mensajes`, `Chat`, etc.
- Cambios en `AppSidebar` / `AppHeader` reales.
- Ajustes de datos, Supabase o RLS.

## 6. Notas técnicas

- Fuentes vía `<link>` en `index.html` (Geist + Geist Mono).
- `cva` + `tailwind-merge` para variantes (ya instalados).
- Modo oscuro con `class="dark"` en `<html>` — tokens duplicados.
- `data-density="compact"` reduce paddings/tamaños base.
- Iconografía: `lucide-react` (única familia permitida).
- Charts: `recharts` (ya en el proyecto) envuelto para forzar tokens.

Al aprobar el plan, comienzo por (1) tokens + fuentes, (2) primitivos, (3) formularios, (4) navegación, (5) superficies, (6) data, (7) feedback, (8) charts, (9) página `/design-system`.
