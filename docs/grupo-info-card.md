# GrupoInfoCard y estados compartidos — Guía de uso

Componentes que garantizan un diseño uniforme en todos los módulos del área
de **Grupos** (Planeación, Reportes, Dashboard, etc.). Antes de crear un
markup manual con `rounded-xl border bg-card …`, usa estos bloques.

Ubicación:

- `@/components/grupos/GrupoInfoCard` → `GrupoInfoCard`, `GrupoInfoCardSkeleton`, `GrupoCardsSkeletonGrid`
- `@/components/shared/EmptyState` → `EmptyState`

---

## 1. `GrupoInfoCard`

Tarjeta unificada para vistas de grupo (planeaciones, reportes, tesorería, etc.).

### Props principales

| Prop            | Tipo                                                     | Descripción                                                             |
| --------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `title`         | `ReactNode` (obligatorio)                                | Título visible y accesible.                                             |
| `subtitle`      | `ReactNode`                                              | Texto secundario bajo el título.                                        |
| `badge`         | `{ label, tone? }`                                       | Píldora superior. Tonos: `neutral · info · success · warning · danger`. |
| `metaDate`      | `{ label, value }`                                       | Fila de fecha con icono de calendario y label accesible (`sr-only`).    |
| `metaSecondary` | `ReactNode`                                              | Segunda línea informativa (ligera).                                     |
| `extraBadge`    | `ReactNode`                                              | Slot para badges/pills adicionales.                                     |
| `description`   | `ReactNode`                                              | Texto corto (`line-clamp-2`).                                           |
| `attendance`    | `ReactNode`                                              | Bloque libre (por ejemplo barra de asistencia).                         |
| `summaryTitle`  | `ReactNode`                                              | Encabezado del bloque `summary`.                                        |
| `summary`       | `GrupoCardSummaryRow[]`                                  | Filas `label / value` con `icon`, `emphasis`, `divided`.                |
| `actions`       | `ReactNode`                                              | Botonera inferior. Sus clicks **no** disparan `onClick` del card.       |
| `onClick`       | `() => void`                                             | Convierte la tarjeta en `role="button"`, `tabIndex=0` y Enter/Espacio.  |
| `ariaLabel`     | `string`                                                 | Sobrescribe el nombre accesible cuando `title` no es string.            |
| `className`     | `string`                                                 | Clases adicionales; nunca hardcodear colores.                           |

### Ejemplo — tarjeta de Planeación

```tsx
<GrupoInfoCard
  title={plan.titulo}
  subtitle={`Semana ${plan.numero_semana}`}
  badge={{ label: "Plan", tone: "info" }}
  metaDate={{ label: "Fecha", value: format(plan.fecha, "dd MMM yyyy") }}
  summaryTitle="Resumen semanal"
  summary={[
    { label: "Personas invitadas", value: plan.invitados, icon: Users },
    { label: "Ayuno", value: plan.fecha_ayuno ?? "—", icon: Calendar },
    { label: "Evangelización", value: plan.evangelizacion ?? "—", divided: true, emphasis: true },
  ]}
  actions={
    <>
      <Button size="sm" variant="outline" onClick={() => onView(plan)}>Ver</Button>
      <Button size="sm" variant="ghost" onClick={() => onDelete(plan.id)}>Eliminar</Button>
    </>
  }
/>
```

### Ejemplo — tarjeta de Reporte (clickable)

```tsx
<GrupoInfoCard
  title={reporte.grupo_nombre}
  subtitle={reporte.red}
  badge={{ label: reporte.estado, tone: reporte.verificado ? "success" : "warning" }}
  metaDate={{ label: "Reunión", value: reporte.fecha }}
  attendance={<AsistenciaBar value={reporte.asistencia_pct} />}
  summary={[
    { label: "Asistentes", value: reporte.asistentes, icon: Users },
    { label: "Ofrenda", value: fmtCOP(reporte.ofrenda), emphasis: true, divided: true },
  ]}
  onClick={() => openReporte(reporte.id)}
/>
```

### Tonos de `badge`

| Tono      | Cuándo usarlo                            |
| --------- | ---------------------------------------- |
| `neutral` | Etiquetas descriptivas (tipo, categoría) |
| `info`    | Estados informativos (Plan, Borrador)    |
| `success` | Verificado, completado, al día           |
| `warning` | Pendiente de revisión, atrasos leves     |
| `danger`  | Rechazado, en mora, error                |

---

## 2. `GrupoCardsSkeletonGrid` y `GrupoInfoCardSkeleton`

Estado de carga uniforme. Reemplaza cualquier grilla de `Skeleton` manual.

```tsx
{isLoading ? (
  <GrupoCardsSkeletonGrid count={6} />
) : items.length === 0 ? (
  <EmptyState ... />
) : (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {items.map((item) => <GrupoInfoCard key={item.id} {...} />)}
  </div>
)}
```

Accesibilidad: la grilla expone `role="status"`, `aria-busy="true"` y
`aria-label="Cargando tarjetas de grupo"` — los lectores de pantalla
anuncian el estado sin trabajo adicional.

---

## 3. `EmptyState`

Estado vacío / sin resultados. Tres variantes: `compact | default | hero`.

```tsx
<EmptyState
  icon={ClipboardList}
  title="Sin planeaciones"
  description="Crea la primera planeación para esta red."
  action={<Button onClick={openForm}>Nueva planeación</Button>}
  secondary={<Button variant="ghost" onClick={openImport}>Importar</Button>}
/>
```

Guía rápida:

- **Sin datos iniciales** → `variant="hero"` con `action` primaria.
- **Sin resultados de filtro** → `variant="default"` con `secondary` para "Limpiar filtros".
- **Panel lateral o card interna** → `variant="compact"`.

---

## 4. Patrón recomendado por pantalla

```tsx
if (isLoading) return <GrupoCardsSkeletonGrid count={6} />;
if (error)     return <ErrorState onRetry={refetch} />;
if (!data?.length) {
  return (
    <EmptyState
      icon={Icon}
      title="Sin registros"
      description="..."
      action={<Button>Crear</Button>}
    />
  );
}
return (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {data.map((row) => <GrupoInfoCard key={row.id} {...map(row)} />)}
  </div>
);
```

---

## 5. Reglas de consistencia

1. **No** duplicar el markup `rounded-xl border bg-card p-5 …` — usa `GrupoInfoCard`.
2. **No** hardcodear colores (`text-white`, `bg-blue-500`). Usa `tone` o tokens semánticos.
3. Toda tarjeta clickable debe pasar `onClick` (el componente añade rol, foco y teclado).
4. Iconos decorativos internos usan `aria-hidden` — no añadir `alt` textual.
5. Los slots `actions` reciben botones `shadcn` — evita `<a>` sin `role="button"`.
6. Estados de carga y vacío **siempre** en este orden: skeleton → error → vacío → contenido.

---

## 6. Tests

Los componentes tienen cobertura en `src/test/grupo-info-card.test.tsx`
(render, tonos de badge, accesibilidad de teclado, skeletons y variantes de
`EmptyState`). Al añadir props nuevas, actualiza esas pruebas.
