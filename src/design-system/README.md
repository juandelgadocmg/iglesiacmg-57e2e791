# DOXA Design System

ADN visual y librería de componentes de DOXA. Inspirado en Linear, Stripe, Vercel, Notion, HubSpot, Clerk y Supabase.

## Cómo se usa

```tsx
import {
  Button, Badge, KpiCard, DataTable, EmptyState,
  Sidebar, TopNav, CommandPalette,
} from "@/design-system";
```

**Regla de oro:** las pantallas nunca crean sus propios wrappers de Card, Button, Tabs, etc. Todo sale de `@/design-system`.

## Estructura

- `tokens.ts` / `motion.ts` — fundaciones (color, spacing, radios, sombras, motion).
- `primitives/` — Button, Badge, Chip, Avatar, Tooltip, Skeleton, etc.
- `forms/` — Input, Select, MultiSelect, FormField, Wizard.
- `nav/` — Sidebar, TopNav, Breadcrumbs, Tabs, CommandPalette, Pagination.
- `surfaces/` — Card, KpiCard, EmptyState, Modal, Drawer, Popover.
- `data/` — DataTable, FilterBar, Kanban, Timeline, ActivityFeed, Calendar.
- `charts/` — AreaChartCard, BarChartCard, DonutChartCard, SparkLine.
- `feedback/` — Toast helpers, ConfirmDialog, InlineAlert.

## Tokens

Definidos en `src/index.css`. Los más importantes:

| Token | Uso |
|---|---|
| `bg-surface-{0..4}` | Superficies escalonadas (0=canvas, 4=elev). |
| `text-fg`, `text-fg-muted`, `text-fg-subtle` | Foreground. |
| `border-border-subtle`, `border-border`, `border-border-strong` | Bordes. |
| `bg-primary`, `bg-accent` | Marca. |
| `bg-success`, `bg-warning`, `bg-destructive`, `bg-info` | Semántico. |
| `text-chart-{1..8}` | Series de gráficas. |
| `shadow-elev-{1..5}` | Elevación. |

## Showcase

Ruta `/design-system` (protegida) — renderiza cada sección como storybook ligero.
