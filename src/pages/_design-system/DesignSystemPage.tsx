/**
 * DOXA · Design System Showcase
 * Ruta interna `/design-system`. Renderiza cada categoría del sistema como
 * un storybook ligero. NO se enlaza desde el sidebar público.
 */
import { useState } from "react";
import {
  // primitives
  Button, IconButton, Badge, Chip, Tag, Kbd, Avatar, AvatarGroup, StatusDot,
  Divider, Spinner, ProgressBar, ProgressRing, Tooltip, Skeleton, SkeletonText,
  // forms
  Input, Textarea, SearchInput, Select, MultiSelect, Switch, Checkbox, FormField, Fieldset, Wizard,
  // nav
  Breadcrumbs, Tabs, CommandPalette, Pagination,
  // surfaces
  Card, SectionCard, KpiCard, StatCard, EmptyState, Callout, Banner, Modal, Drawer,
  // data
  DataTable, FilterBar, Kanban, Timeline, ActivityFeed, NotificationCard, Widget,
  // charts
  SparkLine, TrendDelta, AreaChartCard, BarChartCard, LineChartCard, DonutChartCard,
  // feedback
  notify, ConfirmDialog,
} from "@/design-system";
import {
  Home, Users, DollarSign, TrendingUp, Search, Plus, Settings, Bell, Sparkles,
  Filter, Download, Upload, Command, Inbox, Calendar as CalIcon, MessageSquare,
  CheckCircle2, AlertTriangle, HeartHandshake, Package, Zap, Circle,
} from "lucide-react";

const swatch = (name: string, cls: string) => (
  <div key={name} className="space-y-1.5">
    <div className={`h-14 rounded-lg border border-border-subtle shadow-elev-1 ${cls}`} />
    <div className="text-[11px]">
      <div className="font-medium text-fg">{name}</div>
    </div>
  </div>
);

const sparkData = Array.from({ length: 12 }).map((_, i) => ({ v: 20 + Math.sin(i / 1.8) * 8 + i * 1.4 }));
const areaData = Array.from({ length: 8 }).map((_, i) => ({ m: `S${i + 1}`, ingresos: 40 + i * 6 + (i % 2 ? 4 : 0), gastos: 22 + i * 3 }));

const tableRows = [
  { id: 1, name: "María López", email: "maria@doxa.io", role: "Líder", status: "Activo", amount: 1240 },
  { id: 2, name: "Andrés Ruiz", email: "andres@doxa.io", role: "Pastor", status: "Activo", amount: 890 },
  { id: 3, name: "Camila Rojas", email: "camila@doxa.io", role: "Tesorería", status: "Pausado", amount: 320 },
  { id: 4, name: "Julián Vega", email: "julian@doxa.io", role: "Maestro", status: "Activo", amount: 512 },
];

const sections = [
  { id: "found", label: "Fundaciones" },
  { id: "prim", label: "Primitivos" },
  { id: "forms", label: "Formularios" },
  { id: "nav", label: "Navegación" },
  { id: "surf", label: "Superficies" },
  { id: "data", label: "Data" },
  { id: "charts", label: "Charts" },
  { id: "feed", label: "Feedback" },
];

export default function DesignSystemPage() {
  const [section, setSection] = useState("found");
  const [openCmd, setOpenCmd] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [multi, setMulti] = useState<string[]>(["a", "c"]);
  const [wizardStep, setWizardStep] = useState("info");

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <header className="border-b border-border-subtle bg-surface-1/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-6 h-14">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center size-7 rounded-md bg-primary text-primary-foreground text-xs font-bold">D</span>
            <span className="font-semibold text-fg">DOXA · Design System</span>
            <Badge tone="brand" size="xs">v1.0</Badge>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" leadingIcon={<Command />} onClick={() => setOpenCmd(true)}>
              ⌘K
            </Button>
            <Button size="sm" variant="secondary" leadingIcon={<Download />}>Export tokens</Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-2">
          <Tabs items={sections.map((s) => ({ value: s.id, label: s.label }))} value={section} onChange={setSection} variant="underline" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {section === "found" && <FoundationsSection />}
        {section === "prim" && <PrimitivesSection openConfirm={() => setOpenConfirm(true)} />}
        {section === "forms" && (
          <FormsSection
            multi={multi} setMulti={setMulti}
            wizardStep={wizardStep} setWizardStep={setWizardStep}
          />
        )}
        {section === "nav" && (
          <NavSection page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} openCmd={() => setOpenCmd(true)} />
        )}
        {section === "surf" && (
          <SurfacesSection
            openModal={() => setOpenModal(true)}
            openDrawer={() => setOpenDrawer(true)}
          />
        )}
        {section === "data" && <DataSection />}
        {section === "charts" && <ChartsSection />}
        {section === "feed" && <FeedbackSection openConfirm={() => setOpenConfirm(true)} />}
      </main>

      {/* Overlays demo */}
      <CommandPalette
        open={openCmd}
        onOpenChange={setOpenCmd}
        groups={[
          {
            heading: "Navegar",
            actions: [
              { id: "n1", label: "Ir a Dashboard", icon: Home, shortcut: "G D", onRun: () => notify.info("Navegando a Dashboard") },
              { id: "n2", label: "Ir a Personas", icon: Users, shortcut: "G P", onRun: () => {} },
              { id: "n3", label: "Ir a Finanzas", icon: DollarSign, shortcut: "G F", onRun: () => {} },
            ],
          },
          {
            heading: "Acciones",
            actions: [
              { id: "a1", label: "Crear registro", icon: Plus, shortcut: "N", onRun: () => notify.success("Registro creado") },
              { id: "a2", label: "Configuración", icon: Settings, onRun: () => {} },
            ],
          },
        ]}
      />
      <Modal
        open={openModal}
        onOpenChange={setOpenModal}
        title="Publicar cambios"
        description="Se aplicarán a todos los usuarios de la organización."
        icon={Sparkles}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button onClick={() => { setOpenModal(false); notify.success("Cambios publicados"); }}>Publicar</Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          Esto reemplazará la configuración anterior. Puedes revertir desde el historial durante 24 h.
        </p>
      </Modal>
      <Drawer
        open={openDrawer}
        onOpenChange={setOpenDrawer}
        title="Detalles de contacto"
        description="Vista lateral de perfil"
        footer={<>
          <Button variant="ghost" onClick={() => setOpenDrawer(false)}>Cerrar</Button>
          <Button onClick={() => setOpenDrawer(false)}>Guardar</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Nombre completo" required><Input defaultValue="María López" /></FormField>
          <FormField label="Correo"><Input type="email" leadingIcon={<Search />} defaultValue="maria@doxa.io" /></FormField>
          <FormField label="Notas" hint="Máx 500"><Textarea rows={5} placeholder="Escribe una nota…" /></FormField>
        </div>
      </Drawer>
      <ConfirmDialog
        open={openConfirm}
        onOpenChange={setOpenConfirm}
        title="¿Eliminar registro?"
        description="Esta acción no se puede deshacer."
        tone="danger"
        confirmLabel="Eliminar"
        onConfirm={() => { setOpenConfirm(false); notify.success("Registro eliminado"); }}
      />
    </div>
  );
}

/* ────────── Foundations ────────── */
function FoundationsSection() {
  return (
    <>
      <SectionCard title="Superficies" description="Escala de fondos, borders y foregrounds semánticos.">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {swatch("surface-0", "bg-surface-0")}
          {swatch("surface-1", "bg-surface-1")}
          {swatch("surface-2", "bg-surface-2")}
          {swatch("surface-3", "bg-surface-3")}
          {swatch("surface-4", "bg-surface-4")}
        </div>
      </SectionCard>

      <SectionCard title="Marca y semánticos" description="Colores intencionales — nunca hex sueltos en pantallas.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {swatch("primary", "bg-primary")}
          {swatch("accent", "bg-accent")}
          {swatch("success", "bg-success")}
          {swatch("warning", "bg-warning")}
          {swatch("destructive", "bg-destructive")}
          {swatch("info", "bg-info")}
          {swatch("muted", "bg-muted")}
          {swatch("card", "bg-card border")}
        </div>
      </SectionCard>

      <SectionCard title="Data-viz" description="Serie perceptualmente uniforme para gráficas.">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {[1,2,3,4,5,6,7,8].map((n) => swatch(`chart-${n}`, `bg-chart-${n}`))}
        </div>
      </SectionCard>

      <SectionCard title="Tipografía" description="Sora (display) + Manrope (UI/body) + mono para números.">
        <div className="space-y-3">
          <div><div className="text-[11px] text-fg-muted uppercase tracking-wider">display · 48</div><p className="font-display text-[48px] leading-none font-bold text-fg">DOXA Design System</p></div>
          <div><div className="text-[11px] text-fg-muted uppercase tracking-wider">h1 · 30</div><h1 className="text-3xl font-semibold text-fg">Panel ejecutivo</h1></div>
          <div><div className="text-[11px] text-fg-muted uppercase tracking-wider">h2 · 20</div><h2 className="text-xl font-semibold text-fg">Sección secundaria</h2></div>
          <div><div className="text-[11px] text-fg-muted uppercase tracking-wider">body · 14</div><p className="text-sm text-fg">Texto de interfaz por defecto — legible en densidad alta.</p></div>
          <div><div className="text-[11px] text-fg-muted uppercase tracking-wider">mono · 14</div><p className="font-mono tabular-nums text-fg">$ 12,480.35 · 128 registros</p></div>
        </div>
      </SectionCard>

      <SectionCard title="Radios & Sombras" description="Radios: xs · sm · md · lg · xl · 2xl · pill. Sombras: elev-1..5.">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {(["xs","sm","md","lg","xl","2xl"] as const).map((r) => (
            <div key={r} className="text-center space-y-1.5">
              <div className={`h-14 bg-surface-1 border border-border shadow-elev-2 rounded-${r}`} />
              <div className="text-[11px] text-fg-muted">rounded-{r}</div>
            </div>
          ))}
        </div>
        <Divider />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1,2,3,4,5].map((n) => (
            <div key={n} className="text-center space-y-1.5">
              <div className={`h-14 bg-card rounded-xl border border-border shadow-elev-${n}`} />
              <div className="text-[11px] text-fg-muted">shadow-elev-{n}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Motion" description="Duraciones y easings estandarizados.">
        <ul className="text-sm text-fg-muted space-y-1 font-mono">
          <li>fast · <span className="text-fg">120ms</span> · UI hover / press</li>
          <li>base · <span className="text-fg">180ms</span> · dropdowns, chips, tabs</li>
          <li>slow · <span className="text-fg">240ms</span> · popovers, tooltips</li>
          <li>page · <span className="text-fg">320ms</span> · transiciones de ruta</li>
        </ul>
      </SectionCard>
    </>
  );
}

/* ────────── Primitivos ────────── */
function PrimitivesSection({ openConfirm }: { openConfirm: () => void }) {
  return (
    <>
      <SectionCard title="Buttons" description="5 variantes × 4 tamaños. Estados: hover, focus, active, disabled, loading.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="destructive" onClick={openConfirm}>Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">xs</Button>
            <Button size="sm">sm</Button>
            <Button size="md">md</Button>
            <Button size="lg">lg</Button>
            <IconButton label="Add" size="icon"><Plus /></IconButton>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button leadingIcon={<Download />} variant="secondary">Descargar</Button>
            <Button trailingIcon={<Upload />}>Publicar</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Badges & Chips" description="Etiquetas semánticas y filtros interactivos.">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="brand" dot>Brand</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success" dot>Activo</Badge>
          <Badge tone="warning">En riesgo</Badge>
          <Badge tone="danger">Vencido</Badge>
          <Badge tone="info">Nuevo</Badge>
          <Badge tone="outline">Beta</Badge>
        </div>
        <Divider />
        <div className="flex flex-wrap gap-2">
          <Chip tone="neutral" onRemove={() => {}}>Rol: Líder</Chip>
          <Chip tone="brand" active>Estado: Activo</Chip>
          <Chip tone="accent" onRemove={() => {}}>Sede: Central</Chip>
          <Tag>id_412</Tag>
          <Tag>fecha</Tag>
        </div>
      </SectionCard>

      <SectionCard title="Avatares, estado y kbd">
        <div className="flex items-end gap-4 flex-wrap">
          <Avatar name="María López" size="xs" />
          <Avatar name="Andrés Ruiz" size="sm" />
          <Avatar name="Camila Rojas" size="md" />
          <Avatar name="Julián Vega" size="lg" ring />
          <Avatar name="DA" size="xl" ring />
          <AvatarGroup people={[{ name: "M L" }, { name: "A R" }, { name: "C R" }, { name: "J V" }, { name: "K T" }, { name: "L P" }]} />
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <StatusDot tone="success" pulse /> Online
            <StatusDot tone="warning" /> Idle
            <StatusDot tone="danger" /> Offline
          </div>
          <div className="flex items-center gap-1 text-sm text-fg-muted">
            Buscar: <Kbd>⌘</Kbd> <Kbd>K</Kbd>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Progreso y skeletons">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <ProgressBar value={72} showLabel label="Discipulado" />
            <ProgressBar value={42} tone="accent" showLabel label="Asistencia" />
            <ProgressBar value={90} tone="success" showLabel label="Meta mensual" />
            <div className="flex items-center gap-3">
              <ProgressRing value={64} />
              <ProgressRing value={38} tone="accent" />
              <ProgressRing value={92} tone="success" size={56} stroke={5} />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <SkeletonText lines={4} />
            <div className="flex items-center gap-2">
              <Spinner /> <span className="text-sm text-fg-muted">Cargando registros…</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Tooltip">
        <div className="flex gap-3">
          <Tooltip content="Guardar cambios (⌘S)"><Button variant="secondary">Guardar</Button></Tooltip>
          <Tooltip content="Elimina el registro seleccionado" side="right"><Button variant="ghost">Eliminar</Button></Tooltip>
        </div>
      </SectionCard>
    </>
  );
}

/* ────────── Formularios ────────── */
function FormsSection({
  multi, setMulti, wizardStep, setWizardStep,
}: { multi: string[]; setMulti: (v: string[]) => void; wizardStep: string; setWizardStep: (v: string) => void }) {
  const wizardSteps = [
    { id: "info", label: "Información", description: "Datos básicos" },
    { id: "plan", label: "Plan", description: "Selecciona plan" },
    { id: "billing", label: "Facturación", description: "Método de pago" },
    { id: "review", label: "Revisar" },
  ];
  return (
    <>
      <SectionCard title="Inputs">
        <div className="grid md:grid-cols-2 gap-4">
          <FormField label="Nombre" required>
            <Input placeholder="María López" />
          </FormField>
          <FormField label="Correo" hint="Nunca lo compartiremos">
            <Input type="email" leadingIcon={<Search />} placeholder="tu@correo.com" />
          </FormField>
          <FormField label="Monto" description="Sin decimales">
            <Input leadingAddon="$" trailingAddon="COP" defaultValue="1200000" />
          </FormField>
          <FormField label="Contraseña" error="Debe tener al menos 8 caracteres">
            <Input type="password" state="error" />
          </FormField>
          <FormField label="Bio" optional>
            <Textarea placeholder="Cuéntanos sobre ti…" />
          </FormField>
          <FormField label="Búsqueda global">
            <SearchInput placeholder="Buscar…" shortcut="⌘K" onClear={() => {}} value="mari" />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Select & Multi-select">
        <div className="grid md:grid-cols-2 gap-4">
          <FormField label="Sede">
            <Select
              options={[{ value: "cent", label: "Central" }, { value: "norte", label: "Norte" }, { value: "sur", label: "Sur" }]}
              placeholder="Selecciona sede"
            />
          </FormField>
          <FormField label="Roles ministeriales">
            <MultiSelect
              value={multi}
              onChange={setMulti}
              options={[
                { value: "a", label: "Alabanza" },
                { value: "b", label: "Bienvenida" },
                { value: "c", label: "Cafetería" },
                { value: "d", label: "Diaconía" },
                { value: "e", label: "Enseñanza" },
              ]}
            />
          </FormField>
          <Fieldset legend="Preferencias" description="Ajustes de notificación">
            <div className="flex items-center gap-3"><Switch id="s1" /><label htmlFor="s1" className="text-sm">Emails semanales</label></div>
            <div className="flex items-center gap-3"><Switch id="s2" defaultChecked /><label htmlFor="s2" className="text-sm">Notificaciones push</label></div>
            <div className="flex items-center gap-3"><Checkbox id="c1" defaultChecked /><label htmlFor="c1" className="text-sm">Acepto los términos</label></div>
          </Fieldset>
        </div>
      </SectionCard>

      <SectionCard title="Wizard" description="Stepper para flujos multi-paso.">
        <div className="space-y-6">
          <Wizard steps={wizardSteps} currentId={wizardStep} onStepClick={setWizardStep} />
          <div className="grid md:grid-cols-3 gap-6">
            <Card padding="md" className="md:col-span-2">Contenido paso: <b>{wizardStep}</b></Card>
            <Wizard orientation="vertical" steps={wizardSteps} currentId={wizardStep} onStepClick={setWizardStep} />
          </div>
        </div>
      </SectionCard>
    </>
  );
}

/* ────────── Navegación ────────── */
function NavSection({
  page, setPage, pageSize, setPageSize, openCmd,
}: { page: number; setPage: (n: number) => void; pageSize: number; setPageSize: (n: number) => void; openCmd: () => void }) {
  const [tab, setTab] = useState("overview");
  return (
    <>
      <SectionCard title="Breadcrumbs & Tabs">
        <div className="space-y-4">
          <Breadcrumbs items={[{ label: "Inicio", to: "/design-system" }, { label: "Personas", to: "/design-system" }, { label: "María López" }]} />
          <div className="space-y-3">
            <Tabs
              variant="underline"
              value={tab}
              onChange={setTab}
              items={[
                { value: "overview", label: "Resumen", icon: Home },
                { value: "act", label: "Actividad", icon: Bell, badge: 3 },
                { value: "team", label: "Equipo", icon: Users },
                { value: "money", label: "Finanzas", icon: DollarSign },
              ]}
            />
            <Tabs
              variant="pill"
              value={tab}
              onChange={setTab}
              items={[
                { value: "overview", label: "Resumen" },
                { value: "act", label: "Actividad" },
                { value: "team", label: "Equipo" },
              ]}
            />
            <div className="max-w-sm">
              <Tabs
                variant="segmented"
                value={tab}
                onChange={setTab}
                items={[
                  { value: "overview", label: "Día" },
                  { value: "act", label: "Semana" },
                  { value: "team", label: "Mes" },
                ]}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Command Palette" description="Atajos globales ⌘K / Ctrl+K.">
        <Button onClick={openCmd} leadingIcon={<Command />}>Abrir Command Palette</Button>
      </SectionCard>

      <SectionCard title="Paginación">
        <Pagination
          page={page}
          pageCount={12}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          totalItems={287}
        />
      </SectionCard>
    </>
  );
}

/* ────────── Superficies ────────── */
function SurfacesSection({ openModal, openDrawer }: { openModal: () => void; openDrawer: () => void }) {
  return (
    <>
      <SectionCard title="Cards" description="4 elevaciones. Composición vía SectionCard.">
        <div className="grid md:grid-cols-4 gap-3">
          {(["flat","low","mid","high"] as const).map((e) => (
            <Card key={e} elevation={e} padding="md">
              <p className="text-xs text-fg-muted uppercase tracking-wider">elevation</p>
              <p className="text-sm font-semibold text-fg">{e}</p>
            </Card>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="KPI Cards & StatCards" description="Métricas canónicas con sparkline y delta.">
        <div className="grid md:grid-cols-4 gap-3">
          <KpiCard
            label="Miembros activos"
            value="1,284"
            delta={{ value: 8.4 }}
            icon={Users}
            hint="vs mes anterior"
            sparkline={<SparkLine data={sparkData} />}
          />
          <KpiCard label="Ingresos" value="$ 24.8M" tone="accent" icon={DollarSign} delta={{ value: 2.1 }} sparkline={<SparkLine data={sparkData} color="hsl(var(--chart-2))" />} />
          <KpiCard label="Retención" value="94.2%" tone="success" icon={TrendingUp} delta={{ value: -1.2, positive: false }} />
          <KpiCard label="Alertas" value="12" tone="warning" icon={AlertTriangle} hint="pendientes" />
        </div>
        <Divider />
        <div className="grid md:grid-cols-4 gap-3">
          <StatCard label="Personas" value="1284" sub="+42 este mes" icon={Users} />
          <StatCard label="Grupos" value="87" sub="6 redes" icon={HeartHandshake} />
          <StatCard label="Eventos" value="14" sub="próximos 30 días" icon={CalIcon} />
          <StatCard label="Paquetes" value="3.2k" icon={Package} />
        </div>
      </SectionCard>

      <SectionCard title="Empty states">
        <div className="grid md:grid-cols-2 gap-4">
          <EmptyState
            icon={Inbox}
            title="Aún no hay mensajes"
            description="Cuando alguien te escriba, aparecerá aquí."
            action={<Button size="sm" leadingIcon={<Plus />}>Redactar</Button>}
            variant="bordered"
          />
          <EmptyState
            icon={Search}
            title="Sin resultados"
            description="Prueba con otros filtros o palabras clave."
            secondaryAction={<Button size="sm" variant="ghost">Limpiar filtros</Button>}
            variant="muted"
          />
        </div>
      </SectionCard>

      <SectionCard title="Callouts & Banner">
        <div className="space-y-3">
          <Callout tone="info" title="Actualización disponible" dismissible>Nueva versión 2.4 con mejoras de rendimiento.</Callout>
          <Callout tone="success" title="Cambios guardados">Todo se sincronizó correctamente.</Callout>
          <Callout tone="warning" title="Verificación pendiente" actions={<Button size="xs" variant="secondary">Verificar</Button>}>
            Tu dirección de correo aún no ha sido confirmada.
          </Callout>
          <Callout tone="danger" title="Error de conexión">No pudimos guardar los cambios. Reintenta.</Callout>
          <Banner tone="brand" icon={Sparkles} actions={<Button size="xs" variant="secondary">Ver plan</Button>}>
            Estás usando la versión gratuita — desbloquea todo el DS con DOXA Pro.
          </Banner>
        </div>
      </SectionCard>

      <SectionCard title="Modal & Drawer">
        <div className="flex gap-2">
          <Button onClick={openModal}>Abrir Modal</Button>
          <Button variant="secondary" onClick={openDrawer}>Abrir Drawer</Button>
        </div>
      </SectionCard>
    </>
  );
}

/* ────────── Data ────────── */
function DataSection() {
  const [sel, setSel] = useState<(string | number)[]>([]);
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" | null }>({ id: "name", dir: "asc" });
  return (
    <>
      <SectionCard title="Filter bar + DataTable" description="Toolbar + selección + ordenamiento + empty + loading.">
        <DataTable
          columns={[
            { id: "name", header: "Nombre", sortable: true, cell: (r) => (
              <div className="flex items-center gap-2.5">
                <Avatar name={r.name} size="sm" />
                <div>
                  <div className="font-medium text-fg">{r.name}</div>
                  <div className="text-xs text-fg-subtle">{r.email}</div>
                </div>
              </div>
            )},
            { id: "role", header: "Rol", cell: (r) => <Tag>{r.role}</Tag> },
            { id: "status", header: "Estado", cell: (r) => (
              <Badge tone={r.status === "Activo" ? "success" : "warning"} dot>{r.status}</Badge>
            )},
            { id: "amount", header: "Aporte", align: "right", sortable: true, cell: (r) => `$ ${r.amount.toLocaleString()}` },
          ]}
          data={tableRows}
          rowKey={(r) => r.id}
          selectable
          selected={sel}
          onSelectChange={setSel}
          sort={sort}
          onSortChange={setSort as any}
          toolbar={
            <FilterBar
              search={<SearchInput placeholder="Buscar personas…" />}
              chips={[
                { id: "sede", label: "Sede: Central", active: true, onRemove: () => {} },
                { id: "rol", label: "Rol: Líder", onRemove: () => {} },
              ]}
              onClearAll={() => {}}
              actions={<>
                <Button size="sm" variant="ghost" leadingIcon={<Filter />}>Filtros</Button>
                <Button size="sm" variant="secondary" leadingIcon={<Download />}>Exportar</Button>
                <Button size="sm" leadingIcon={<Plus />}>Nueva persona</Button>
              </>}
            />
          }
          footer={<Pagination page={1} pageCount={12} onPageChange={() => {}} totalItems={287} pageSize={25} onPageSizeChange={() => {}} />}
        />
      </SectionCard>

      <SectionCard title="Kanban" description="Shell visual con drag & drop entre columnas.">
        <Kanban
          columns={[
            { id: "todo", title: "Por hacer", color: "neutral", cards: [{ id: "1", title: "Diseñar landing evento", meta: "Vence en 2d", tags: ["Marketing","Evento"] }] },
            { id: "doing", title: "En curso", color: "brand", wip: 3, cards: [
              { id: "2", title: "Reporte financiero Q3", meta: "María López · Tesorería", tags: ["Q3"] },
              { id: "3", title: "Migración de datos", meta: "Andrés Ruiz" },
            ]},
            { id: "review", title: "Revisión", color: "warning", cards: [{ id: "4", title: "Aprobar textos boletín", meta: "Comité editorial", footer: "3 comentarios" }] },
            { id: "done", title: "Hecho", color: "success", cards: [{ id: "5", title: "Publicar cambios v2.3" }] },
          ]}
        />
      </SectionCard>

      <SectionCard title="Timeline & Activity feed">
        <div className="grid md:grid-cols-2 gap-6">
          <Timeline events={[
            { id: "1", date: "2026-07-16T09:00:00Z", title: "Check-in registrado", description: "Servicio dominical", tone: "success", icon: CheckCircle2 },
            { id: "2", date: "2026-07-14T10:00:00Z", title: "Nota pastoral", description: "Seguimiento discipulado", tone: "brand", icon: MessageSquare },
            { id: "3", date: "2026-07-10T18:30:00Z", title: "Donación recibida", description: "$120.000 · PSE", tone: "accent", icon: DollarSign },
          ]} />
          <ActivityFeed items={[
            { id: "a", actor: { name: "María López" }, action: "creó la tarea", target: "Reporte Q3", time: "hace 4 min" },
            { id: "b", actor: { name: "Andrés Ruiz" }, action: "asignó a", target: "Camila R.", time: "hace 22 min" },
            { id: "c", actor: { name: "Sistema" }, action: "cerró el corte financiero automáticamente", time: "hace 1 h" },
          ]} />
        </div>
      </SectionCard>

      <SectionCard title="Notification cards">
        <div className="space-y-2 max-w-md">
          <NotificationCard unread tone="success" icon={CheckCircle2} title="Pago aprobado" description="Suscripción DOXA Pro renovada." time="hace 2 min" onDismiss={() => {}} />
          <NotificationCard tone="warning" icon={AlertTriangle} title="3 cuotas vencidas" description="Revisa el módulo de matrículas." time="hoy" onDismiss={() => {}} />
          <NotificationCard tone="info" icon={Bell} title="Nuevo mensaje" description="María López te ha respondido." time="ayer" onDismiss={() => {}} />
        </div>
      </SectionCard>

      <SectionCard title="Widget shell (dashboard)">
        <div className="grid md:grid-cols-3 gap-3">
          <Widget title="Miembros" icon={Users} tone="brand">
            <p className="text-3xl font-bold font-mono text-fg">1,284</p>
            <TrendDelta value={3.4} />
          </Widget>
          <Widget title="Grupos" icon={HeartHandshake} tone="accent">
            <p className="text-3xl font-bold font-mono text-fg">87</p>
            <TrendDelta value={-0.8} invert />
          </Widget>
          <Widget title="Eventos" icon={CalIcon}>
            <p className="text-3xl font-bold font-mono text-fg">14</p>
            <TrendDelta value={0} />
          </Widget>
        </div>
      </SectionCard>
    </>
  );
}

/* ────────── Charts ────────── */
function ChartsSection() {
  const donutData = [
    { name: "Diezmos", value: 62 },
    { name: "Ofrendas", value: 22 },
    { name: "Eventos", value: 10 },
    { name: "Otros", value: 6 },
  ];
  return (
    <>
      <SectionCard title="Charts premium" description="Todas las gráficas leen tokens --chart-* y comparten estilos.">
        <div className="grid lg:grid-cols-2 gap-4">
          <AreaChartCard
            title="Ingresos vs Gastos"
            subtitle="Últimas 8 semanas"
            data={areaData}
            xKey="m"
            series={[{ key: "ingresos", label: "Ingresos" }, { key: "gastos", label: "Gastos", color: "hsl(var(--chart-6))" }]}
          />
          <BarChartCard
            title="Asistencia por servicio"
            data={areaData}
            xKey="m"
            series={[{ key: "ingresos", label: "Adultos" }, { key: "gastos", label: "Jóvenes", color: "hsl(var(--chart-3))" }]}
            stacked
          />
          <LineChartCard
            title="Nuevos miembros"
            data={areaData}
            xKey="m"
            series={[{ key: "ingresos", label: "Actual" }, { key: "gastos", label: "Meta", color: "hsl(var(--chart-5))" }]}
          />
          <DonutChartCard
            title="Distribución financiera"
            data={donutData}
            centerLabel="Total"
            centerValue="100%"
          />
        </div>
      </SectionCard>

      <SectionCard title="Sparkline & TrendDelta">
        <div className="grid md:grid-cols-4 gap-3">
          <Card padding="md">
            <p className="text-xs text-fg-muted uppercase tracking-wider">MRR</p>
            <p className="text-2xl font-bold font-mono text-fg">$12.4k</p>
            <SparkLine data={sparkData} />
            <TrendDelta value={4.2} />
          </Card>
          <Card padding="md">
            <p className="text-xs text-fg-muted uppercase tracking-wider">Churn</p>
            <p className="text-2xl font-bold font-mono text-fg">2.8%</p>
            <SparkLine data={sparkData.slice().reverse()} color="hsl(var(--chart-6))" />
            <TrendDelta value={-1.2} invert />
          </Card>
          <Card padding="md">
            <p className="text-xs text-fg-muted uppercase tracking-wider">NPS</p>
            <p className="text-2xl font-bold font-mono text-fg">62</p>
            <SparkLine data={sparkData} color="hsl(var(--chart-4))" />
            <TrendDelta value={0} />
          </Card>
          <Card padding="md">
            <p className="text-xs text-fg-muted uppercase tracking-wider">Ingresos</p>
            <p className="text-2xl font-bold font-mono text-fg">$24.8M</p>
            <SparkLine data={sparkData} color="hsl(var(--chart-2))" />
            <TrendDelta value={8.4} />
          </Card>
        </div>
      </SectionCard>
    </>
  );
}

/* ────────── Feedback ────────── */
function FeedbackSection({ openConfirm }: { openConfirm: () => void }) {
  return (
    <>
      <SectionCard title="Toasts" description="Ejecuta `notify.success/error/warning/info/message`.">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => notify.success("Guardado", { description: "Los cambios se aplicaron." })}>Success</Button>
          <Button variant="secondary" onClick={() => notify.error("No se pudo eliminar", { description: "Reintenta en unos segundos." })}>Error</Button>
          <Button variant="secondary" onClick={() => notify.warning("Sesión por expirar")}>Warning</Button>
          <Button variant="secondary" onClick={() => notify.info("Nueva actualización disponible")}>Info</Button>
          <Button variant="secondary" onClick={() => notify.message("Recordatorio", { description: "Reunión a las 5pm" })}>Neutral</Button>
        </div>
      </SectionCard>

      <SectionCard title="Confirm dialog">
        <Button variant="destructive" onClick={openConfirm} leadingIcon={<Zap />}>Eliminar registro…</Button>
      </SectionCard>
    </>
  );
}
