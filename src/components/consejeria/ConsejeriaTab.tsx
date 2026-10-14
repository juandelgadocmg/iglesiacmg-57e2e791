import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { usePersonas } from "@/hooks/useDatabase";
import {
  useCitasConsejeria, useUpsertCita, useDeleteCita,
  useConsejerosHorarios, useUpsertHorario, useDeleteHorario,
  useSlotsDisponibles, useObservaciones, useUpsertObservacion,
} from "@/hooks/useConsejeria";
import { isPastorPrincipal } from "@/lib/personaRoles";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Clock, Heart, MapPin, Plus, Trash2, User, Video, MessageSquare, Check, X } from "lucide-react";
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ExportDropdown from "@/components/shared/ExportDropdown";
import SectionHero from "@/components/shell/SectionHero";

const CITAS_EXPORT_COLUMNS = [
  { header: "Fecha", key: "fecha" },
  { header: "Hora", key: "hora" },
  { header: "Solicitante", key: "solicitante" },
  { header: "Email", key: "email" },
  { header: "Teléfono", key: "telefono" },
  { header: "Consejero", key: "consejero" },
  { header: "Modalidad", key: "modalidad" },
  { header: "Categoría", key: "categoria" },
  { header: "Motivo", key: "motivo" },
  { header: "Estado", key: "estado" },
  { header: "Intercesión", key: "intercesion" },
  { header: "Consolidación", key: "consolidacion" },
];

const mapCitaForExport = (c: any) => ({
  fecha: c.fecha,
  hora: `${c.hora_inicio?.slice(0,5) || ""} - ${c.hora_fin?.slice(0,5) || ""}`,
  solicitante: c.solicitante_nombre || "",
  email: c.solicitante_email || "",
  telefono: c.solicitante_telefono || "",
  consejero: c.consejero_nombre || "",
  modalidad: c.modalidad || "",
  categoria: c.motivo_categoria || "",
  motivo: c.motivo_descripcion || "",
  estado: c.estado || "",
  intercesion: c.requiere_intercesion ? "Sí" : "No",
  consolidacion: c.requiere_consolidacion ? "Sí" : "No",
});

const DIAS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MOTIVOS = [
  { value: "espiritual", label: "Espiritual" },
  { value: "familiar", label: "Familiar" },
  { value: "emocional", label: "Emocional" },
  { value: "liderazgo", label: "Liderazgo" },
  { value: "matrimonial", label: "Matrimonial" },
  { value: "otro", label: "Otro" },
];
const ESTADO_COLORS: Record<string,string> = {
  pendiente: "bg-warning/15 text-warning border-warning/30",
  confirmada: "bg-primary/15 text-primary border-primary/30",
  completada: "bg-success/15 text-success border-success/30",
  cancelada: "bg-destructive/15 text-destructive border-destructive/30",
  no_asistio: "bg-muted text-muted-foreground border-border",
};

export default function ConsejeriaTab() {
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const isStaff = roles.some(r => ["admin","super_admin","pastor","secretaria"].includes(r));
  const isAdmin = roles.some(r => ["admin","super_admin","pastor"].includes(r));

  const { data: personas = [] } = usePersonas();
  const consejeros = useMemo(() => personas.filter(isPastorPrincipal), [personas]);

  const [sub, setSub] = useState(isStaff ? "calendario" : "agendar");

  const SUBTABS = [
    ...(isStaff ? [{ id: "calendario", label: "Calendario", icon: CalendarIcon }] : []),
    { id: "agendar", label: "Agendar", icon: Plus },
    { id: "mis", label: "Mis citas", icon: User },
    ...(isAdmin ? [{ id: "horarios", label: "Horarios", icon: Clock }] : []),
    ...(isAdmin ? [{ id: "seguimiento", label: "Seguimiento", icon: MessageSquare }] : []),
  ];

  return (
    <div className="space-y-4">
      <SectionHero
        icon={Heart}
        eyebrow="Pastoral Care"
        title="Consejería pastoral"
        description="Agenda citas, gestiona horarios de consejeros y da seguimiento espiritual con confidencialidad."
        gradient="from-rose-600 via-pink-500 to-fuchsia-500"
        stats={[
          { label: "Consejeros", value: consejeros.length, tone: "info" },
          { label: "Modalidades", value: 3 },
          { label: "Rol", value: isAdmin ? "Admin" : isStaff ? "Staff" : "Miembro", tone: "ok" },
          { label: "Vista", value: SUBTABS.find(t => t.id === sub)?.label ?? "—" },
        ]}
      />

      <div className="flex flex-wrap gap-1 p-1 rounded-xl border bg-card/60 w-fit">
        {SUBTABS.map((t) => {
          const active = sub === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-br from-rose-600 to-pink-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {isStaff && sub === "calendario" && <CalendarioView consejeros={consejeros} isAdmin={isAdmin} />}
      {sub === "agendar" && <AgendarWizard consejeros={consejeros} userId={user?.id} personas={personas} isStaff={isStaff} />}
      {sub === "mis" && <MisCitas userId={user?.id} consejeros={consejeros} />}
      {isAdmin && sub === "horarios" && <HorariosAdmin consejeros={consejeros} />}
      {isAdmin && sub === "seguimiento" && <SeguimientoView consejeros={consejeros} />}
    </div>
  );
}

// ============ CALENDARIO ============
function CalendarioView({ consejeros, isAdmin }: any) {
  const [filterConsejero, setFilterConsejero] = useState<string>("todos");
  const [filterModalidad, setFilterModalidad] = useState<string>("todas");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedCita, setSelectedCita] = useState<any>(null);

  const { data: citas = [] } = useCitasConsejeria({
    consejeroId: filterConsejero !== "todos" ? filterConsejero : undefined,
    modalidad: filterModalidad !== "todas" ? filterModalidad : undefined,
    desde: format(weekStart, "yyyy-MM-dd"),
    hasta: format(addDays(weekStart, 6), "yyyy-MM-dd"),
  });

  const dias = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 items-center">
            <Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</Button>
            <CardTitle className="text-base">
              {format(weekStart, "d MMM", { locale: es })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, 7))}>›</Button>
            <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Hoy</Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterConsejero} onValueChange={setFilterConsejero}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los consejeros</SelectItem>
                {consejeros.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombres} {c.apellidos}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterModalidad} onValueChange={setFilterModalidad}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas modalidades</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
              </SelectContent>
            </Select>
            <ExportDropdown
              title="Citas de consejería"
              filename={`consejeria-${format(weekStart, "yyyy-MM-dd")}`}
              columns={CITAS_EXPORT_COLUMNS}
              data={citas.map(mapCitaForExport)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {dias.map(d => {
            const dayCitas = citas.filter(c => isSameDay(parseISO(c.fecha), d));
            return (
              <div key={d.toISOString()} className={cn("border rounded-md p-2 min-h-[140px]", isSameDay(d, new Date()) && "border-primary bg-primary/5")}>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  {format(d, "EEE d", { locale: es })}
                </div>
                <div className="space-y-1">
                  {dayCitas.map(c => (
                    <button key={c.id} onClick={() => setSelectedCita(c)}
                      className={cn("w-full text-left text-xs p-1.5 rounded border hover:shadow-sm", ESTADO_COLORS[c.estado])}>
                      <div className="font-semibold">{c.hora_inicio.slice(0,5)}</div>
                      <div className="truncate">{c.solicitante_nombre}</div>
                      <div className="flex items-center gap-1 opacity-75">
                        {c.modalidad === "virtual" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CitaDetailDialog cita={selectedCita} onClose={() => setSelectedCita(null)} canEdit={isAdmin} />
    </Card>
  );
}

// ============ AGENDAR WIZARD ============
function AgendarWizard({ consejeros, userId, personas, isStaff }: any) {
  const [step, setStep] = useState(1);
  const [consejeroId, setConsejeroId] = useState<string>("");
  const [modalidad, setModalidad] = useState<"presencial"|"virtual">("presencial");
  const [fecha, setFecha] = useState<Date | undefined>();
  const [slot, setSlot] = useState<{inicio:string;fin:string} | null>(null);
  const [motivoCat, setMotivoCat] = useState("espiritual");
  const [motivoDesc, setMotivoDesc] = useState("");
  const [solicitantePersonaId, setSolicitantePersonaId] = useState<string>("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  const fechaStr = fecha ? format(fecha, "yyyy-MM-dd") : undefined;
  const { data: slots = [] } = useSlotsDisponibles(consejeroId || undefined, fechaStr, modalidad);
  const upsert = useUpsertCita();
  const consejero = consejeros.find((c: any) => c.id === consejeroId);

  const reset = () => {
    setStep(1); setConsejeroId(""); setFecha(undefined); setSlot(null);
    setMotivoCat("espiritual"); setMotivoDesc(""); setSolicitantePersonaId("");
    setNombre(""); setEmail(""); setTelefono("");
  };

  const handleSubmit = async () => {
    if (!consejeroId || !fechaStr || !slot || !nombre) return;
    await upsert.mutateAsync({
      solicitante_persona_id: solicitantePersonaId || null,
      solicitante_user_id: userId || null,
      solicitante_nombre: nombre,
      solicitante_email: email || null,
      solicitante_telefono: telefono || null,
      consejero_persona_id: consejeroId,
      consejero_nombre: `${consejero.nombres} ${consejero.apellidos}`,
      consejero_email: consejero.email || null,
      fecha: fechaStr,
      hora_inicio: slot.inicio + ":00",
      hora_fin: slot.fin + ":00",
      modalidad,
      motivo_categoria: motivoCat,
      motivo_descripcion: motivoDesc || null,
      estado: "pendiente",
      created_by: userId || null,
    });
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agendar cita de consejería — Paso {step} de 4</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 1 && (
          <div className="space-y-3">
            <Label>Selecciona consejero</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {consejeros.map((c: any) => (
                <button key={c.id} onClick={() => { setConsejeroId(c.id); setStep(2); }}
                  className={cn("p-4 border rounded-lg text-left hover:border-primary transition", consejeroId === c.id && "border-primary bg-primary/5")}>
                  <div className="font-semibold">{c.nombres} {c.apellidos}</div>
                  <div className="text-xs text-muted-foreground">{c.sexo === "Femenino" ? "Pastora" : "Pastor"}</div>
                </button>
              ))}
              {consejeros.length === 0 && <p className="text-sm text-muted-foreground col-span-2">No hay consejeros configurados. Asigna el tipo "Pastor Principal" a una persona.</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Label>Modalidad</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["presencial","virtual"] as const).map(m => (
                <button key={m} onClick={() => { setModalidad(m); setStep(3); }}
                  className={cn("p-4 border rounded-lg flex items-center gap-3 hover:border-primary", modalidad === m && "border-primary bg-primary/5")}>
                  {m === "virtual" ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  <span className="capitalize font-medium">{m}</span>
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>‹ Atrás</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Label>Fecha y hora disponibles</Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Calendar mode="single" selected={fecha} onSelect={(d) => { setFecha(d); setSlot(null); }}
                  disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} locale={es} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{fecha ? format(fecha, "EEEE d 'de' MMMM", { locale: es }) : "Selecciona una fecha"}</p>
                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                  {slots.map(s => (
                    <button key={s.inicio} onClick={() => setSlot(s)}
                      className={cn("p-2 border rounded text-sm hover:border-primary", slot?.inicio === s.inicio && "border-primary bg-primary/10")}>
                      {s.inicio}
                    </button>
                  ))}
                  {fecha && slots.length === 0 && <p className="text-xs text-muted-foreground col-span-3">Sin horarios disponibles este día</p>}
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>‹ Atrás</Button>
              <Button size="sm" disabled={!slot} onClick={() => setStep(4)}>Continuar ›</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            {isStaff && (
              <div>
                <Label>Persona (opcional, si está en directorio)</Label>
                <Select value={solicitantePersonaId} onValueChange={(v) => {
                  setSolicitantePersonaId(v);
                  const p = personas.find((x: any) => x.id === v);
                  if (p) { setNombre(`${p.nombres} ${p.apellidos}`); setEmail(p.email || ""); setTelefono(p.telefono || p.whatsapp || ""); }
                }}>
                  <SelectTrigger><SelectValue placeholder="Buscar..." /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {personas.slice(0, 200).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombres} {p.apellidos}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Nombre completo *</Label><Input value={nombre} onChange={e=>setNombre(e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
              <div><Label>Teléfono</Label><Input value={telefono} onChange={e=>setTelefono(e.target.value)} /></div>
              <div>
                <Label>Categoría del motivo</Label>
                <Select value={motivoCat} onValueChange={setMotivoCat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOTIVOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripción del motivo</Label>
              <Textarea value={motivoDesc} onChange={e=>setMotivoDesc(e.target.value)} placeholder="Cuéntanos brevemente sobre qué deseas conversar..." />
            </div>
            <div className="bg-muted/40 p-3 rounded text-sm space-y-1">
              <div><strong>Consejero:</strong> {consejero?.nombres} {consejero?.apellidos}</div>
              <div><strong>Fecha:</strong> {fecha && format(fecha, "EEEE d 'de' MMMM yyyy", { locale: es })}</div>
              <div><strong>Hora:</strong> {slot?.inicio} – {slot?.fin}</div>
              <div><strong>Modalidad:</strong> <span className="capitalize">{modalidad}</span></div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>‹ Atrás</Button>
              <Button onClick={handleSubmit} disabled={!nombre || upsert.isPending}>
                {upsert.isPending ? "Agendando..." : "Confirmar cita"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ MIS CITAS ============
function MisCitas({ userId, consejeros }: any) {
  const { data: citas = [] } = useCitasConsejeria({ miUserId: userId });
  const del = useDeleteCita();
  const upd = useUpsertCita();
  const [selected, setSelected] = useState<any>(null);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Mis citas</CardTitle></CardHeader>
      <CardContent>
        {citas.length === 0 ? <p className="text-sm text-muted-foreground">No tienes citas agendadas.</p> : (
          <div className="space-y-2">
            {citas.map(c => (
              <div key={c.id} className="border rounded p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{c.consejero_nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(c.fecha), "EEEE d 'de' MMMM", { locale: es })} · {c.hora_inicio.slice(0,5)} · <span className="capitalize">{c.modalidad}</span>
                  </div>
                </div>
                <Badge className={cn(ESTADO_COLORS[c.estado])}>{c.estado}</Badge>
                <Button size="sm" variant="outline" onClick={() => setSelected(c)}>Ver</Button>
                {c.estado !== "cancelada" && c.estado !== "completada" && (
                  <Button size="sm" variant="ghost" className="text-destructive"
                    onClick={() => upd.mutate({ id: c.id, estado: "cancelada" })}>Cancelar</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CitaDetailDialog cita={selected} onClose={() => setSelected(null)} canEdit={false} />
    </Card>
  );
}

// ============ HORARIOS ADMIN ============
function HorariosAdmin({ consejeros }: any) {
  const { data: horarios = [] } = useConsejerosHorarios();
  const upsert = useUpsertHorario();
  const del = useDeleteHorario();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => { setEditing({ dia_semana: 1, hora_inicio: "08:00", hora_fin: "12:00", duracion_minutos: 60, modalidad: "ambas", activo: true }); setOpen(true); };
  const openEdit = (h: any) => { setEditing({ ...h }); setOpen(true); };

  const save = async () => {
    if (!editing.consejero_persona_id) return;
    await upsert.mutateAsync(editing);
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Horarios de disponibilidad</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
      </CardHeader>
      <CardContent>
        {consejeros.map((c: any) => {
          const list = horarios.filter(h => h.consejero_persona_id === c.id);
          return (
            <div key={c.id} className="mb-4">
              <h4 className="font-semibold text-sm mb-2">{c.nombres} {c.apellidos}</h4>
              {list.length === 0 ? <p className="text-xs text-muted-foreground">Sin horarios configurados</p> : (
                <div className="grid md:grid-cols-2 gap-2">
                  {list.map(h => (
                    <div key={h.id} className="border rounded p-2 flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{DIAS[h.dia_semana]}</div>
                        <div className="text-xs text-muted-foreground">
                          {h.hora_inicio.slice(0,5)} – {h.hora_fin.slice(0,5)} · {h.duracion_minutos}min · {h.modalidad}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(h)}><User className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(h.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nuevo"} horario</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Consejero</Label>
                <Select value={editing.consejero_persona_id || ""} onValueChange={v => setEditing({ ...editing, consejero_persona_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>{consejeros.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombres} {c.apellidos}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Día</Label>
                  <Select value={String(editing.dia_semana)} onValueChange={v => setEditing({ ...editing, dia_semana: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIAS.map((d,i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Modalidad</Label>
                  <Select value={editing.modalidad} onValueChange={v => setEditing({ ...editing, modalidad: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambas">Ambas</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Hora inicio</Label><Input type="time" value={editing.hora_inicio} onChange={e => setEditing({ ...editing, hora_inicio: e.target.value })} /></div>
                <div><Label>Hora fin</Label><Input type="time" value={editing.hora_fin} onChange={e => setEditing({ ...editing, hora_fin: e.target.value })} /></div>
                <div><Label>Duración (min)</Label><Input type="number" value={editing.duracion_minutos} onChange={e => setEditing({ ...editing, duracion_minutos: Number(e.target.value) })} /></div>
                <div className="flex items-end gap-2"><Switch checked={editing.activo} onCheckedChange={v => setEditing({ ...editing, activo: v })} /><Label>Activo</Label></div>
              </div>
              <div><Label>Lugar (presencial)</Label><Input value={editing.lugar || ""} onChange={e => setEditing({ ...editing, lugar: e.target.value })} /></div>
              <div><Label>Enlace virtual base</Label><Input value={editing.enlace_virtual || ""} onChange={e => setEditing({ ...editing, enlace_virtual: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={upsert.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============ SEGUIMIENTO ============
function SeguimientoView({ consejeros }: any) {
  const { data: citas = [] } = useCitasConsejeria({});
  const upd = useUpsertCita();
  const [selected, setSelected] = useState<any>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroConsejero, setFiltroConsejero] = useState<string>("todos");

  const filtradas = citas.filter(c =>
    (filtroEstado === "todos" || c.estado === filtroEstado) &&
    (filtroConsejero === "todos" || c.consejero_persona_id === filtroConsejero)
  );
  // Más recientes primero
  const ordenadas = [...filtradas].sort((a, b) =>
    (b.fecha + (b.hora_inicio || "")).localeCompare(a.fecha + (a.hora_inicio || ""))
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Seguimiento de citas</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="confirmada">Confirmadas</SelectItem>
                <SelectItem value="completada">Asistió</SelectItem>
                <SelectItem value="no_asistio">No asistió</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroConsejero} onValueChange={setFiltroConsejero}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los consejeros</SelectItem>
                {consejeros.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombres} {c.apellidos}</SelectItem>)}
              </SelectContent>
            </Select>
            <ExportDropdown
              title="Citas de consejería"
              filename={`consejeria-seguimiento-${new Date().toISOString().split("T")[0]}`}
              columns={CITAS_EXPORT_COLUMNS}
              data={ordenadas.map(mapCitaForExport)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {ordenadas.length === 0 ? <p className="text-sm text-muted-foreground">No hay citas con los filtros actuales.</p> : (
          <div className="space-y-2">
            {ordenadas.map(c => (
              <div key={c.id} className="border rounded p-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <div className="font-semibold">{c.solicitante_nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.consejero_nombre} · {format(parseISO(c.fecha), "d MMM yyyy", { locale: es })} · {c.hora_inicio?.slice(0,5)} · {c.motivo_categoria}
                  </div>
                </div>
                <Badge className={cn(ESTADO_COLORS[c.estado])}>{c.estado}</Badge>
                {c.requiere_intercesion && <Badge variant="outline" className="bg-purple-100 text-purple-700"><Heart className="h-3 w-3 mr-1" />Intercesión</Badge>}
                {c.requiere_consolidacion && <Badge variant="outline" className="bg-blue-100 text-blue-700">Consolidación</Badge>}
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="text-success border-success/40 hover:bg-success/10"
                    onClick={() => upd.mutate({ id: c.id, estado: "completada" })}
                    title="Marcar como asistió">
                    <Check className="h-4 w-4 mr-1" />Asistió
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => upd.mutate({ id: c.id, estado: "no_asistio" })}
                    title="Marcar como no asistió">
                    <X className="h-4 w-4 mr-1" />No asistió
                  </Button>
                  <Button size="sm" onClick={() => setSelected(c)}>Detalles</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CitaDetailDialog cita={selected} onClose={() => setSelected(null)} canEdit={true} showObservaciones />
    </Card>
  );
}

// ============ DETAIL DIALOG ============
function CitaDetailDialog({ cita, onClose, canEdit, showObservaciones }: any) {
  const upd = useUpsertCita();
  const del = useDeleteCita();
  const { data: obs = [] } = useObservaciones(cita?.id);
  const upObs = useUpsertObservacion();
  
  const [newObs, setNewObs] = useState({ notas: "", estado_caso: "en_proceso", proxima_accion: "", fecha_seguimiento: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  if (!cita) return null;

  const handleEditChange = (field: string, value: any) => {
    setEditData({ ...editData, [field]: value });
  };

  const handleSaveEdit = async () => {
    await upd.mutateAsync({
      id: cita.id,
      fecha: editData.fecha,
      hora_inicio: editData.hora_inicio,
      hora_fin: editData.hora_fin,
      modalidad: editData.modalidad,
      motivo_categoria: editData.motivo_categoria,
      motivo_descripcion: editData.motivo_descripcion,
    });
    setIsEditing(false);
    onClose();
  };

  return (
    <Dialog open={!!cita} onOpenChange={(o) => { if (!o) { setIsEditing(false); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cita de {cita.solicitante_nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {!isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Consejero:</strong> {cita.consejero_nombre}</div>
                <div><strong>Modalidad:</strong> <span className="capitalize">{cita.modalidad}</span></div>
                <div><strong>Fecha:</strong> {format(parseISO(cita.fecha), "d MMM yyyy", { locale: es })}</div>
                <div><strong>Hora:</strong> {cita.hora_inicio.slice(0,5)} – {cita.hora_fin.slice(0,5)}</div>
                <div><strong>Categoría:</strong> {cita.motivo_categoria}</div>
                <div><strong>Estado:</strong> <Badge className={cn(ESTADO_COLORS[cita.estado] || "bg-muted text-muted-foreground border-border")}>{cita.estado}</Badge></div>
              </div>
              {cita.motivo_descripcion && <div><strong>Motivo:</strong><p className="mt-1 text-muted-foreground">{cita.motivo_descripcion}</p></div>}
              {cita.solicitante_email && <div><strong>Email:</strong> {cita.solicitante_email}</div>}
              {cita.solicitante_telefono && <div><strong>Teléfono:</strong> {cita.solicitante_telefono}</div>}
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input type="date" value={editData.fecha || ""} onChange={e => handleEditChange("fecha", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Modalidad</Label>
                  <Select value={editData.modalidad} onValueChange={v => handleEditChange("modalidad", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Hora Inicio</Label>
                  <Input type="time" value={editData.hora_inicio || ""} onChange={e => handleEditChange("hora_inicio", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Hora Fin</Label>
                  <Input type="time" value={editData.hora_fin || ""} onChange={e => handleEditChange("hora_fin", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Categoría</Label>
                  <Select value={editData.motivo_categoria} onValueChange={v => handleEditChange("motivo_categoria", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MOTIVOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Motivo (Descripción)</Label>
                <Textarea value={editData.motivo_descripcion || ""} onChange={e => handleEditChange("motivo_descripcion", e.target.value)} />
              </div>
            </div>
          )}

          {!isEditing && canEdit && (
            <div className="border-t pt-3 space-y-2">
              <Label>Cambiar estado</Label>
              <div className="flex gap-2 flex-wrap">
                {["pendiente","confirmada","completada","no_asistio","cancelada"].map(s => (
                  <Button key={s} size="sm" variant={cita.estado === s ? "default" : "outline"}
                    onClick={() => upd.mutate({ id: cita.id, estado: s })}>{s}</Button>
                ))}
              </div>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={cita.requiere_intercesion} onCheckedChange={v => upd.mutate({ id: cita.id, requiere_intercesion: v })} />
                  Requiere intercesión
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={cita.requiere_consolidacion} onCheckedChange={v => upd.mutate({ id: cita.id, requiere_consolidacion: v })} />
                  Requiere consolidación
                </label>
              </div>
            </div>
          )}

          {!isEditing && showObservaciones && (
            <div className="border-t pt-3 space-y-2">
              <h4 className="font-semibold">Observaciones</h4>
              {obs.map((o: any) => (
                <div key={o.id} className="bg-muted/40 p-2 rounded">
                  <div className="text-xs text-muted-foreground">{format(parseISO(o.created_at), "d MMM yyyy HH:mm", { locale: es })} · {o.estado_caso}</div>
                  <div className="text-sm mt-1">{o.notas}</div>
                  {o.proxima_accion && <div className="text-xs mt-1"><strong>Próxima acción:</strong> {o.proxima_accion}</div>}
                </div>
              ))}
              <div className="space-y-2 border-t pt-2">
                <Textarea placeholder="Notas..." value={newObs.notas} onChange={e => setNewObs({ ...newObs, notas: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newObs.estado_caso} onValueChange={v => setNewObs({ ...newObs, estado_caso: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_proceso">En proceso</SelectItem>
                      <SelectItem value="seguimiento">Seguimiento</SelectItem>
                      <SelectItem value="cerrado">Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={newObs.fecha_seguimiento} onChange={e => setNewObs({ ...newObs, fecha_seguimiento: e.target.value })} />
                </div>
                <Input placeholder="Próxima acción" value={newObs.proxima_accion} onChange={e => setNewObs({ ...newObs, proxima_accion: e.target.value })} />
                <Button size="sm" onClick={async () => {
                  if (!newObs.notas) return;
                  await upObs.mutateAsync({ cita_id: cita.id, ...newObs, fecha_seguimiento: newObs.fecha_seguimiento || null });
                  setNewObs({ notas: "", estado_caso: "en_proceso", proxima_accion: "", fecha_seguimiento: "" });
                }}>Guardar observación</Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4 flex sm:justify-between w-full">
          {canEdit && !isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setEditData(cita);
                setIsEditing(true);
              }}>Editar</Button>
              <Button variant="destructive" onClick={async () => {
                if (confirm("¿Estás seguro de que deseas eliminar esta cita de consejería? Esta acción no se puede deshacer.")) {
                  await del.mutateAsync(cita.id);
                  onClose();
                }
              }}>Eliminar</Button>
            </div>
          )}
          {isEditing ? (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button onClick={handleSaveEdit}>Guardar Cambios</Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => { setIsEditing(false); onClose(); }}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
