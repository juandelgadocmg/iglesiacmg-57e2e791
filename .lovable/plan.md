
# Rearquitectura UX de DOXA

Objetivo: pasar de un CRUD uniforme (título + botón + KPIs + tabla) a un **workspace productivo** al nivel de HubSpot, Linear y Notion. Sin tocar lógica de negocio ni base de datos — solo capa UX, navegación y composición visual sobre el Design System ya construido.

---

## 1. Modelo mental nuevo

DOXA deja de ser "un menú de módulos" y se convierte en un **workspace pastoral** con tres capas persistentes:

```text
┌─────────────────────────────────────────────────────────────┐
│  ⌘K CommandBar  ·  Sede: Principal ▾  ·  Rol: Pastor ▾  · 🔔│  ← TopBar global
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  Nav     │              Workspace (contextual)              │
│  lateral │                                                  │
│          │  Cada módulo tiene su propio "shell":            │
│          │  inbox, board, mapa, timeline, dashboard, aula…  │
│          │                                                  │
├──────────┴──────────────────────────────────────────────────┤
│  ContextDock (opcional): detalle lateral sin cambiar página │
└─────────────────────────────────────────────────────────────┘
```

Principio: **el módulo elige su shell**, no al revés. Personas = tabla-inbox, Grupos = mapa+jerarquía, Reuniones = timeline, Peticiones = kanban, Finanzas = ledger, Academia = LMS, Mensajes = inbox chat, Dashboard = tablero editable.

---

## 2. Navegación — Sidebar reorganizado

Del listado plano de 16 items pasamos a **4 zonas productivas** + pinned + recents. Colapsable, con badges de trabajo pendiente y atajos.

```text
DOXA ● Principal ▾

⌘  Buscar o ejecutar…            ⌘K
🏠 Hoy                            ← nueva home personal
⭐ Favoritos                      ← usuario ancla items
🕘 Recientes                      ← 5 últimos abiertos

── COMUNIDAD ──────────────
👥 Personas          1.2k
🏘  Grupos            48
⛪ Reuniones          3 hoy
📅 Eventos            2 activos

── FORMACIÓN ──────────────
🎓 Academia
📖 Seminario
🏅 Certificados

── PASTORAL ───────────────
💬 Mensajes           4●
🙏 Peticiones         12
🧭 Consejería
🤖 Chat IA

── OPERACIÓN ──────────────
💰 Finanzas
📊 Reportes

⚙  Admin ▾ (Usuarios · Config · Seguridad)
```

Cambios clave:
- **Hoy**: nueva ruta `/hoy` que reemplaza el Dashboard genérico como landing. Es la bandeja personal del usuario según su rol.
- **Favoritos / Recientes**: `useUserPins` + `useRecentEntities` (localStorage + tabla `user_pins`). Se pueden anclar personas, grupos, reuniones específicas — no solo módulos.
- **Badges vivos** por sección (peticiones abiertas, mensajes sin leer, reuniones de hoy). Un vistazo = plan del día.
- **Admin** se colapsa en un submenú; deja de competir con lo pastoral.
- Selector de **Sede** y **Rol activo** suben al TopBar (hoy están dispersos).

---

## 3. TopBar — barra de mando

Reemplaza al `AppHeader` actual. Elementos, de izquierda a derecha:

1. **Breadcrumbs contextuales** (Personas / Juan Pérez / Actividad).
2. **CommandBar ⌘K** central — el núcleo de productividad:
   - Buscar personas, grupos, reuniones, eventos.
   - Ejecutar acciones ("Registrar asistencia", "Crear petición", "Exportar CSV").
   - Saltar a cualquier ruta.
   - Alterna con `/` para búsqueda pura.
3. **Selector de Sede** (multi-campus real, siempre visible).
4. **Selector de Rol activo** (solo si el usuario tiene >1 rol).
5. **Quick Create (+)** — menú con las 6 creaciones más frecuentes según rol.
6. **Notificaciones 🔔** — dropdown con tabs: Menciones · Sistema · Pastoral.
7. **Avatar** — perfil, tema, atajos, cerrar sesión.

Reducción de clics: crear petición hoy = 3 clics (menú → peticiones → nueva). Con Quick Create + ⌘K = 1 tecla.

---

## 4. Ruta `/hoy` — Home productiva

Reemplaza al Dashboard genérico como pantalla de aterrizaje. Layout tipo Linear "My Issues" + Notion "Home":

```text
┌───────────────────────────────────┬─────────────────────┐
│ Buenos días, Pastor Juan          │  Agenda de hoy      │
│ 3 reuniones · 12 peticiones · 4📩 │  09:00 CDP Norte    │
├───────────────────────────────────┤  18:00 Servicio     │
│ ⚡ Quick Actions                  │                     │
│ [Check-in] [Nueva persona] [+]    │  Próximo cumpleaños │
├───────────────────────────────────┤  María — mañana     │
│ 📥 Tu bandeja                     │                     │
│  • Petición urgente asignada      │  Recientes          │
│  • Mensaje de Ana Ruiz            │  · Juan Pérez       │
│  • Reunión sin líder mañana       │  · Grupo Centro     │
│  • 3 pagos pendientes de aprobar  │                     │
└───────────────────────────────────┴─────────────────────┘
```

Widgets editables (drag & drop) según rol: pastor ve peticiones + reuniones; tesorería ve pagos + CDP; maestro ve calificaciones pendientes.

---

## 5. Shells especializados por módulo

Cada módulo abandona el patrón CRUD. Estructura propuesta por módulo (solo UX, sin cambiar datos):

### Personas — **Inbox-Table híbrido**
- Panel izquierdo: filtros guardados ("Nuevos esta semana", "Sin grupo", "Cumpleaños del mes") + segmentos por sede/red.
- Centro: tabla densa estilo Linear (multi-select, keyboard nav, column config).
- Detalle: se abre en **ContextDock lateral** (no navega fuera). Doble click = perfil completo.
- Sin botón azul aislado — creación desde ⌘K o `+` global.

### Grupos — **Mapa + Jerarquía en split**
- Vista por defecto: mapa Leaflet a la izquierda, árbol ministerial a la derecha, sincronizados (hover en árbol resalta pin).
- Tabs: Mapa · Árbol · Tabla · Reportes. Todos comparten filtros.

### Reuniones — **Timeline semanal**
- Timeline horizontal tipo Google Calendar semanal, filas por sede.
- Cada reunión = card con avatares de servidores y ring de asistencia.
- Panel lateral: check-in QR persistente (no hay que navegar a otra pantalla).

### Eventos — **Board + calendario**
- Kanban (Borrador · Publicado · En curso · Cerrado) + toggle a calendario mensual.
- Detalle en drawer.

### Academia / Seminario — **Shell LMS**
- Sidebar propio del módulo: Programas · Materias · Estudiantes · Aula · Calificaciones · Certificados.
- Landing = "Mi aula" para docentes/estudiantes; admin ve dashboard académico.

### Mensajes — **3 columnas tipo Gmail/Linear**
- Carpetas → Lista de hilos → Conversación. Composer siempre a un atajo.

### Peticiones — **Kanban pastoral**
- Columnas: Nueva · En oración · Seguimiento · Cerrada.
- Filtros por urgencia, sede, asignado. Botón WhatsApp inline en card.

### Finanzas — **Ledger + drill-down**
- Vista contable con periodos, no una tabla plana. Tabs: Ingresos · Egresos · Certificados · CDP.
- KPIs viven en un rail lateral fijo, no como header genérico.

### Certificados — **Galería + generador**
- Grid visual de plantillas + estudiante-a-certificar con preview PDF en vivo.

### Reportes — **Explorador**
- Sidebar con reportes guardados; centro con gráficas configurables; export desde toolbar.

### Chat IA — **Full-screen conversacional**
- Sin sidebar del app; solo hilo + panel de contexto (persona/grupo del que hablas).

### Perfil de Persona — se mantiene el rediseño LinkedIn ya hecho, pero **abre por defecto en ContextDock** desde cualquier tabla, y solo se expande a full-page si el usuario lo pide.

---

## 6. Búsqueda y filtros unificados

- **Un solo componente `GlobalSearch`** (⌘K) indexa personas, grupos, reuniones, eventos, materias, peticiones. Resultados agrupados por tipo con acciones inline.
- **`FilterBar` del DS** se usa en todos los módulos con estructura idéntica: chips activos + "Guardar como vista".
- **Vistas guardadas** (`saved_views`) por usuario y módulo — reemplazan filtros ad-hoc.
- Sinónimos y búsqueda por documento/teléfono ya existentes se conectan al mismo motor.

---

## 7. Quick Actions y creación

- **Quick Create global (+)** en TopBar: menú de 6 acciones según rol activo.
- **Acciones contextuales** en cada shell (barra flotante inferior en tablas con selección múltiple: exportar, asignar grupo, enviar mensaje, marcar asistencia).
- **Atajos de teclado** documentados (`?` los muestra): `g p` → personas, `g h` → hoy, `n p` → nueva persona, `c` → check-in.

---

## 8. Notificaciones

- Dropdown con tabs (Menciones / Sistema / Pastoral) + estado leído/no-leído + "Marcar todo como leído".
- Preferencias ya existen; solo se integran a un centro único.
- Toasts para acciones inmediatas (éxito/error/undo) usando `notify` del DS.

---

## 9. Permisos en la nueva UX

- El sidebar y `/hoy` se **componen dinámicamente por rol activo** — no se muestran módulos vetados (hoy se ocultan pero el layout sigue siendo el mismo para todos).
- Quick Create, atajos y widgets del home se filtran por `useCan()`.
- El selector de rol activo pasa al TopBar para dejar claro "estás viendo DOXA como Pastor".

---

## 10. Alcance de esta fase (solo UX/arquitectura)

Se toca:
- `AppLayout`, `AppSidebar`, `AppHeader` → reescritos sobre `@/design-system/nav/*`.
- Nueva ruta `/hoy` (`src/pages/HoyPage.tsx`) como landing.
- Nuevo `TopBar` con CommandBar ⌘K, Sede, Rol, Quick Create, Notificaciones.
- Nuevo `ContextDock` (drawer lateral persistente) para detalles sin navegar.
- Nuevos "shells" por módulo (envoltorios de layout) — el contenido interno de cada página se reubica sin cambiar hooks ni queries.
- Hooks nuevos: `useUserPins`, `useRecentEntities`, `useSavedViews`, `useCommandRegistry`, `useHotkeys`.

No se toca:
- Migraciones, RLS, edge functions.
- Hooks de datos (`usePersonaPerfil`, `usePrograma`, `useSeminario`, etc.).
- Lógica de asistencia, finanzas, academia, certificados.
- Componentes shadcn en `src/components/ui/**`.

---

## 11. Orden de ejecución sugerido

1. **Shell global**: TopBar + Sidebar nuevos + CommandBar + Notificaciones + ContextDock.
2. **Ruta `/hoy`** como landing + widgets por rol + Quick Create.
3. **Favoritos / Recientes / Vistas guardadas** (persistencia).
4. **Migración por módulo a su shell especializado**, en este orden por impacto:
   Personas → Reuniones → Peticiones → Grupos → Mensajes → Eventos → Finanzas → Academia/Seminario → Certificados → Reportes → Chat IA.
5. **Hotkeys + `?` panel de atajos**.
6. **Limpieza**: remover headers repetidos, botones azules genéricos, KPIs decorativos.

Cada paso es entregable y no rompe módulos aún no migrados (el shell viejo sigue funcionando hasta que su módulo se migra).

---

¿Apruebas esta arquitectura para empezar por el **paso 1 (shell global + TopBar + CommandBar + Sidebar nuevo)**, o quieres ajustar algo antes — por ejemplo, la agrupación de secciones, el contenido de `/hoy` por rol, o el orden de migración de módulos?
