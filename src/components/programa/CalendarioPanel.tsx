import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";
import { useProgEventos, useUpsertEvento, useDeleteEvento } from "@/hooks/usePrograma";
import EventoDetailPanel from "./EventoDetailPanel";

type Vista = "mes" | "semana" | "dia";

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmt(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date) { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() - day); return x; }

export default function CalendarioPanel() {
  const { data: eventos = [] } = useProgEventos();
  const upEv = useUpsertEvento();
  const delEv = useDeleteEvento();
  const [cursor, setCursor] = useState(new Date());
  const [vista, setVista] = useState<Vista>("mes");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [selectedEvId, setSelectedEvId] = useState<string | null>(null);

  const eventosByDate = useMemo(() => {
    const map = new Map<string, typeof eventos>();
    eventos.forEach((e) => {
      const arr = map.get(e.fecha) || [];
      arr.push(e); map.set(e.fecha, arr);
    });
    return map;
  }, [eventos]);

  const save = async () => {
    if (!draft.titulo || !draft.fecha) return toast.error("Título y fecha requeridos");
    try { await upEv.mutateAsync(draft); toast.success("Programación guardada"); setOpen(false); setDraft({}); } catch (e: any) { toast.error(e.message); }
  };

  if (selectedEvId) {
    const ev = eventos.find((e) => e.id === selectedEvId);
    if (ev) return <EventoDetailPanel evento={ev} onBack={() => setSelectedEvId(null)} onDelete={() => { delEv.mutate(ev.id); setSelectedEvId(null); }} />;
  }

  const title = cursor.toLocaleDateString("es", { month: "long", year: "numeric" });
  const goPrev = () => {
    const c = new Date(cursor);
    if (vista === "mes") c.setMonth(c.getMonth() - 1);
    else if (vista === "semana") c.setDate(c.getDate() - 7);
    else c.setDate(c.getDate() - 1);
    setCursor(c);
  };
  const goNext = () => {
    const c = new Date(cursor);
    if (vista === "mes") c.setMonth(c.getMonth() + 1);
    else if (vista === "semana") c.setDate(c.getDate() + 7);
    else c.setDate(c.getDate() + 1);
    setCursor(c);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={goPrev} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="font-semibold text-lg capitalize min-w-[180px] text-center">{title}</h3>
          <Button size="icon" variant="outline" onClick={goNext} aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>Hoy</Button>
        </div>
        <div className="flex gap-2">
          <Select value={vista} onValueChange={(v: Vista) => setVista(v)}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Mes</SelectItem>
              <SelectItem value="semana">Semana</SelectItem>
              <SelectItem value="dia">Día</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDraft({}); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nueva programación</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva programación</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Título</Label><Input value={draft.titulo || ""} onChange={(e) => setDraft({ ...draft, titulo: e.target.value })} placeholder="Ej. Servicio Dominical 9:30 AM" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label>
                    <Select value={draft.tipo || "servicio"} onValueChange={(v) => setDraft({ ...draft, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="servicio">Servicio</SelectItem>
                        <SelectItem value="evento_especial">Evento especial</SelectItem>
                        <SelectItem value="bienvenida">Fiesta de bienvenida</SelectItem>
                        <SelectItem value="retiro">Retiro de Sanidad Interior</SelectItem>
                        <SelectItem value="mega_cdp">Mega Casa de Paz</SelectItem>
                        <SelectItem value="aniversario">Aniversario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Fecha</Label><Input type="date" value={draft.fecha || ""} onChange={(e) => setDraft({ ...draft, fecha: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Hora</Label><Input value={draft.hora || ""} onChange={(e) => setDraft({ ...draft, hora: e.target.value })} placeholder="09:30 AM" /></div>
                  <div><Label>Lugar</Label><Input value={draft.lugar || ""} onChange={(e) => setDraft({ ...draft, lugar: e.target.value })} /></div>
                </div>
                <div><Label>Descripción</Label><Input value={draft.descripcion || ""} onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Crear</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {vista === "mes" && <MesView cursor={cursor} eventosByDate={eventosByDate} onSelect={setSelectedEvId} />}
      {vista === "semana" && <SemanaView cursor={cursor} eventosByDate={eventosByDate} onSelect={setSelectedEvId} />}
      {vista === "dia" && <DiaView cursor={cursor} eventos={eventosByDate.get(fmt(cursor)) || []} onSelect={setSelectedEvId} />}
    </div>
  );
}

function MesView({ cursor, eventosByDate, onSelect }: any) {
  const first = startOfMonth(cursor);
  const startDay = first.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  const today = fmt(new Date());

  return (
    <Card>
      <CardContent className="p-2 md:p-4">
        <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-1">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => <div key={d} className="p-2 text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const key = d ? fmt(d) : `empty-${i}`;
            const evs = d ? (eventosByDate.get(fmt(d)) || []) : [];
            return (
              <div key={key} className={`min-h-[90px] border rounded-md p-1.5 ${d ? "bg-card" : "bg-muted/30"} ${d && fmt(d) === today ? "ring-2 ring-primary" : ""}`}>
                {d && <div className="text-xs font-semibold mb-1">{d.getDate()}</div>}
                <div className="space-y-1">
                  {evs.slice(0, 3).map((e: any) => (
                    <button key={e.id} onClick={() => onSelect(e.id)} className="block w-full text-left text-[10px] px-1.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 truncate">
                      {e.hora && <span className="font-medium">{e.hora} </span>}{e.titulo}
                    </button>
                  ))}
                  {evs.length > 3 && <span className="text-[10px] text-muted-foreground">+{evs.length - 3} más</span>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SemanaView({ cursor, eventosByDate, onSelect }: any) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {days.map((d) => {
        const evs = eventosByDate.get(fmt(d)) || [];
        return (
          <Card key={fmt(d)} className="min-h-[200px]">
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-semibold capitalize">{d.toLocaleDateString("es", { weekday: "short", day: "numeric" })}</div>
              {evs.map((e: any) => (
                <button key={e.id} onClick={() => onSelect(e.id)} className="block w-full text-left text-xs px-2 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20">
                  {e.hora && <div className="font-medium">{e.hora}</div>}<div className="truncate">{e.titulo}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DiaView({ cursor, eventos, onSelect }: any) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="text-lg font-semibold capitalize flex items-center gap-2"><CalIcon className="h-5 w-5" />{cursor.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</div>
        {eventos.length === 0 && <p className="text-sm text-muted-foreground">Sin programaciones.</p>}
        <div className="space-y-2">
          {eventos.map((e: any) => (
            <button key={e.id} onClick={() => onSelect(e.id)} className="w-full text-left p-3 rounded-md border hover:bg-accent">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{e.titulo}</div>
                <Badge variant="outline">{e.estado}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{e.hora || "—"} · {e.lugar || "—"}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
