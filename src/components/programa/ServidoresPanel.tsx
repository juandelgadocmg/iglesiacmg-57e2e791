import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Search, Calendar as CalIcon, LayoutGrid, Users } from "lucide-react";
import { toast } from "sonner";
import { useProgMinisterios, useProgCargos, useProgServidores, useUpsertServidor, useDeleteServidor, useAsignacionesPorPersona, useUpsertDisponibilidad, useProgDisponibilidad, useDeleteDisponibilidad, CARGOS_GENERICOS, getCargoTipo, isPersonaDisponibleEnFecha, type CargoGenerico } from "@/hooks/usePrograma";
import { usePersonas } from "@/hooks/useDatabase";
import SearchableCombobox, { ComboboxItem } from "@/components/seminario/SearchableCombobox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ServidoresPanel() {
  const { data: personas = [] } = usePersonas();
  const { data: ministerios = [] } = useProgMinisterios();
  const { data: cargos = [] } = useProgCargos();
  const { data: servidores = [] } = useProgServidores();
  const { data: disponibilidad = [] } = useProgDisponibilidad();
  const upServ = useUpsertServidor();
  const delServ = useDeleteServidor();
  const upDisp = useUpsertDisponibilidad();
  const delDisp = useDeleteDisponibilidad();
  const stats = useAsignacionesPorPersona();

  const [filterMin, setFilterMin] = useState<string>("all");
  const [filterCargoTipo, setFilterCargoTipo] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [openDisp, setOpenDisp] = useState<string | null>(null);
  const [draftDisp, setDraftDisp] = useState<any>({});
  const [matrixDate, setMatrixDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const personasMap = useMemo(() => new Map(personas.map((p: any) => [p.id, p])), [personas]);
  const cargosMap = useMemo(() => new Map(cargos.map((c) => [c.id, c])), [cargos]);
  const minMap = useMemo(() => new Map(ministerios.map((m) => [m.id, m])), [ministerios]);

  const personaItems: ComboboxItem[] = useMemo(
    () => personas.map((p: any) => ({ id: p.id, label: `${p.nombres} ${p.apellidos}`, sub: p.telefono || p.email || "" })),
    [personas]
  );
  const ministerioItems: ComboboxItem[] = useMemo(
    () => ministerios.map((m) => ({ id: m.id, label: m.nombre, sub: m.descripcion || "" })),
    [ministerios]
  );

  const filtered = servidores.filter((s) => {
    if (filterMin !== "all" && s.ministerio_id !== filterMin) return false;
    if (filterCargoTipo !== "all") {
      const c = s.cargo_id ? cargosMap.get(s.cargo_id) : null;
      const tipo = getCargoTipo(c?.nombre);
      if (tipo !== filterCargoTipo) return false;
    }
    const p: any = personasMap.get(s.persona_id);
    if (!p) return false;
    if (search && !`${p.nombres} ${p.apellidos}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const saveServ = async () => {
    if (!draft.ministerio_id || !draft.persona_id) return toast.error("Persona y ministerio requeridos");
    try { await upServ.mutateAsync(draft); toast.success("Servidor asignado"); setOpenAdd(false); setDraft({}); } catch (e: any) { toast.error(e.message); }
  };
  const saveDisp = async (persona_id: string) => {
    if (!draftDisp.fecha_inicio || !draftDisp.fecha_fin) return toast.error("Rango requerido");
    try { await upDisp.mutateAsync({ ...draftDisp, persona_id }); toast.success("Registrado"); setDraftDisp({}); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Tabs defaultValue="lista" className="space-y-4">
      <TabsList>
        <TabsTrigger value="lista"><Users className="h-3.5 w-3.5 mr-1.5" />Lista de servidores</TabsTrigger>
        <TabsTrigger value="matriz"><LayoutGrid className="h-3.5 w-3.5 mr-1.5" />Matriz por cargos</TabsTrigger>
      </TabsList>
      <TabsContent value="lista" className="space-y-4 mt-0">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-[260px] flex-wrap">
          <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar servidor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" /></div>
          <Select value={filterMin} onValueChange={setFilterMin}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos los ministerios</SelectItem>{ministerios.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterCargoTipo} onValueChange={setFilterCargoTipo}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo de cargo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los cargos</SelectItem>
              {CARGOS_GENERICOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={openAdd} onOpenChange={(o) => { setOpenAdd(o); if (!o) setDraft({}); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Asignar servidor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Asignar servidor a ministerio</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Persona</Label>
                <SearchableCombobox
                  items={personaItems}
                  value={draft.persona_id || ""}
                  onChange={(v) => setDraft({ ...draft, persona_id: v })}
                  placeholder="Buscar persona..."
                  emptyLabel="Sin resultados"
                  width="w-full"
                  allowClear
                />
              </div>
              <div><Label>Ministerio</Label>
                <SearchableCombobox
                  items={ministerioItems}
                  value={draft.ministerio_id || ""}
                  onChange={(v) => setDraft({ ...draft, ministerio_id: v, cargo_id: null })}
                  placeholder="Buscar ministerio..."
                  emptyLabel="Sin resultados"
                  width="w-full"
                  allowClear
                />
              </div>
              <div><Label>Cargo</Label>
                <Select value={draft.cargo_id || ""} onValueChange={(v) => setDraft({ ...draft, cargo_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sin cargo específico" /></SelectTrigger>
                  <SelectContent>{cargos.filter((c) => c.ministerio_id === draft.ministerio_id).map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={saveServ}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => {
          const p: any = personasMap.get(s.persona_id);
          const m = minMap.get(s.ministerio_id);
          const c = s.cargo_id ? cargosMap.get(s.cargo_id) : null;
          const st = stats.get(s.persona_id);
          const disp = disponibilidad.filter((d) => d.persona_id === s.persona_id);
          if (!p) return null;
          return (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar><AvatarFallback>{p.nombres?.[0]}{p.apellidos?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.nombres} {p.apellidos}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.telefono || p.email || "—"}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => delServ.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge style={{ background: (m?.color || "#2563eb") + "20", color: m?.color || "#2563eb", borderColor: (m?.color || "#2563eb") + "40" }} variant="outline">{m?.nombre}</Badge>
                  {c && <Badge variant="secondary">{c.nombre}</Badge>}
                  {s.es_lider && <Badge>Líder</Badge>}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>Servicios: <strong className="text-foreground">{st?.total || 0}</strong></span>
                  <span>Último: <strong className="text-foreground">{st?.lastFecha || "—"}</strong></span>
                </div>
                <Dialog open={openDisp === s.id} onOpenChange={(o) => { setOpenDisp(o ? s.id : null); setDraftDisp({}); }}>
                  <DialogTrigger asChild><Button size="sm" variant="outline" className="w-full"><CalIcon className="h-3.5 w-3.5 mr-1" />Disponibilidad ({disp.length})</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{p.nombres} {p.apellidos} — Ausencias/Vacaciones</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                        <div><Label>Desde</Label><Input type="date" value={draftDisp.fecha_inicio || ""} onChange={(e) => setDraftDisp({ ...draftDisp, fecha_inicio: e.target.value })} /></div>
                        <div><Label>Hasta</Label><Input type="date" value={draftDisp.fecha_fin || ""} onChange={(e) => setDraftDisp({ ...draftDisp, fecha_fin: e.target.value })} /></div>
                        <div><Label>Motivo</Label>
                          <Select value={draftDisp.motivo || "no_disponible"} onValueChange={(v) => setDraftDisp({ ...draftDisp, motivo: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vacaciones">Vacaciones</SelectItem>
                              <SelectItem value="no_disponible">No disponible</SelectItem>
                              <SelectItem value="ausente">Ausente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={() => saveDisp(s.persona_id)}>+</Button>
                      </div>
                      <div className="border-t pt-2 space-y-1 max-h-60 overflow-auto">
                        {disp.map((d) => (
                          <div key={d.id} className="flex justify-between items-center text-sm">
                            <span><Badge variant="outline" className="mr-2">{d.motivo}</Badge>{d.fecha_inicio} → {d.fecha_fin}</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => delDisp.mutate(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                        {disp.length === 0 && <p className="text-xs text-muted-foreground">Sin registros</p>}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No hay servidores registrados.</p>}
      </div>
      </TabsContent>

      <TabsContent value="matriz" className="space-y-4 mt-0">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-end gap-3 justify-between">
              <div>
                <Label className="text-xs">Validar disponibilidad para la fecha</Label>
                <Input type="date" value={matrixDate} onChange={(e) => setMatrixDate(e.target.value)} className="w-[200px] mt-1" />
                <p className="text-[11px] text-muted-foreground mt-1">Antes de programar un servicio, verifica qué cargos están cubiertos y qué servidores están disponibles.</p>
              </div>
              <div className="flex gap-2 text-[11px]">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">● Disponible</Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">● No disponible</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {(filterMin === "all" ? ministerios : ministerios.filter((m) => m.id === filterMin)).map((m) => {
            const cargosMin = cargos.filter((c) => c.ministerio_id === m.id);
            return (
              <Card key={m.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-6 rounded-full" style={{ background: m.color || "#2563eb" }} />
                    <h4 className="font-semibold">{m.nombre}</h4>
                    <Badge variant="secondary" className="text-[10px]">{cargosMin.length} cargo(s)</Badge>
                  </div>
                  {cargosMin.length === 0 && <p className="text-xs text-muted-foreground">Sin cargos definidos.</p>}
                  <div className="grid gap-2 md:grid-cols-2">
                    {cargosMin.map((c) => {
                      const asignados = servidores.filter((s) => s.ministerio_id === m.id && s.cargo_id === c.id && s.activo);
                      const tipo = getCargoTipo(c.nombre);
                      return (
                        <div key={c.id} className="border rounded-md p-2.5 bg-card">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium">{c.nombre}</span>
                              {tipo && <Badge variant="outline" className="text-[9px]">{tipo}</Badge>}
                            </div>
                            <Badge variant="secondary" className="text-[10px]">{asignados.length}/{c.cupo || 1}</Badge>
                          </div>
                          <div className="space-y-1">
                            {asignados.length === 0 && <p className="text-[11px] text-muted-foreground italic">Sin personas asignadas.</p>}
                            {asignados.map((s) => {
                              const p: any = personasMap.get(s.persona_id);
                              if (!p) return null;
                              const disponible = isPersonaDisponibleEnFecha(s.persona_id, matrixDate, disponibilidad);
                              return (
                                <div key={s.id} className="flex items-center justify-between text-xs">
                                  <span className="truncate">{p.nombres} {p.apellidos}</span>
                                  <Badge
                                    variant="outline"
                                    className={disponible
                                      ? "bg-green-50 text-green-700 border-green-200 text-[9px]"
                                      : "bg-red-50 text-red-700 border-red-200 text-[9px]"}
                                  >
                                    {disponible ? "Disponible" : "No disponible"}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  );
}
