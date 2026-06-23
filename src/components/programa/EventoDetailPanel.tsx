import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, Plus, Trash2, Check, X, Clock, MessageSquare, Send, Sparkles, Phone } from "lucide-react";
import { toast } from "sonner";
import { useProgMinisterios, useProgCargos, useProgServidores, useProgAsignaciones, useUpsertAsignacion, useDeleteAsignacion, useAsignacionesPorPersona, useProgDisponibilidad, useUpsertEvento, type ProgEvento } from "@/hooks/usePrograma";
import { usePersonas } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";

export default function EventoDetailPanel({ evento, onBack, onDelete }: { evento: ProgEvento; onBack: () => void; onDelete: () => void }) {
  const { data: ministerios = [] } = useProgMinisterios();
  const { data: cargos = [] } = useProgCargos();
  const { data: servidores = [] } = useProgServidores();
  const { data: asignaciones = [] } = useProgAsignaciones();
  const { data: personas = [] } = usePersonas();
  const { data: disponibilidad = [] } = useProgDisponibilidad();
  const upAsig = useUpsertAsignacion();
  const delAsig = useDeleteAsignacion();
  const upEv = useUpsertEvento();
  const stats = useAsignacionesPorPersona();

  const personasMap = useMemo(() => new Map(personas.map((p: any) => [p.id, p])), [personas]);
  const cargosMap = useMemo(() => new Map(cargos.map((c) => [c.id, c])), [cargos]);
  const minMap = useMemo(() => new Map(ministerios.map((m) => [m.id, m])), [ministerios]);

  const asignsEvento = asignaciones.filter((a) => a.evento_id === evento.id);

  const [addOpen, setAddOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>({});

  const isUnavailable = (personaId: string) => {
    return disponibilidad.some((d) => d.persona_id === personaId && d.fecha_inicio <= evento.fecha && d.fecha_fin >= evento.fecha);
  };

  const suggestionsFor = (ministerio_id: string) => {
    const candidates = servidores.filter((s) => s.ministerio_id === ministerio_id && s.activo);
    return candidates
      .map((s) => {
        const st = stats.get(s.persona_id);
        const unavailable = isUnavailable(s.persona_id);
        return { ...s, total: st?.total || 0, lastFecha: st?.lastFecha, unavailable };
      })
      .sort((a, b) => Number(a.unavailable) - Number(b.unavailable) || a.total - b.total);
  };

  const addAsignacion = async (ministerio_id: string, cargo_id: string | null, persona_id: string) => {
    try { await upAsig.mutateAsync({ evento_id: evento.id, ministerio_id, cargo_id, persona_id, estado: "pendiente" }); toast.success("Asignado"); } catch (e: any) { toast.error(e.message); }
  };

  const autoAssign = async (ministerio_id: string) => {
    const cargosMin = cargos.filter((c) => c.ministerio_id === ministerio_id);
    const ya = new Set(asignsEvento.filter((a) => a.ministerio_id === ministerio_id).map((a) => a.persona_id));
    let count = 0;
    for (const c of cargosMin) {
      const ocupados = asignsEvento.filter((a) => a.cargo_id === c.id).length;
      const faltan = (c.cupo || 1) - ocupados;
      const sugg = suggestionsFor(ministerio_id).filter((s) => !s.unavailable && !ya.has(s.persona_id));
      for (let i = 0; i < faltan && i < sugg.length; i++) {
        await upAsig.mutateAsync({ evento_id: evento.id, ministerio_id, cargo_id: c.id, persona_id: sugg[i].persona_id, estado: "pendiente" });
        ya.add(sugg[i].persona_id); count++;
      }
    }
    toast.success(`Auto-asignados ${count}`);
  };

  const publicar = async () => {
    try {
      await upEv.mutateAsync({ id: evento.id, estado: "publicado", publicado_at: new Date().toISOString() });
      // enviar Correo Interno
      const recipients = Array.from(new Set(asignsEvento.map((a) => personasMap.get(a.persona_id)?.user_id).filter(Boolean)));
      if (recipients.length > 0) {
        await supabase.rpc("msg_send_system" as any, {
          _sender_key: "coordinacion_academica",
          _user_ids: recipients,
          _subject: `Programación: ${evento.titulo}`,
          _body: `Has sido programado para servir el ${evento.fecha}${evento.hora ? " a las " + evento.hora : ""}.\nConfirma tu asistencia en el módulo Reuniones → Programación.`,
        });
      }
      toast.success("Programación publicada y notificada");
    } catch (e: any) { toast.error(e.message); }
  };

  const setEstadoAsig = async (a: any, estado: string) => {
    try { await upAsig.mutateAsync({ id: a.id, estado, confirmado_at: new Date().toISOString() }); } catch (e: any) { toast.error(e.message); }
  };
  const setAsistencia = async (a: any, asistencia: string) => {
    try { await upAsig.mutateAsync({ id: a.id, asistencia, asistencia_at: new Date().toISOString() }); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" />Volver</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={publicar}><Send className="h-4 w-4 mr-1" />Publicar y notificar</Button>
          <Button variant="destructive" size="sm" onClick={() => { if (confirm("¿Eliminar programación?")) onDelete(); }}><Trash2 className="h-4 w-4 mr-1" />Eliminar</Button>
        </div>
      </div>

      <Card className="border-2 border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{evento.titulo}</h2>
              <p className="text-sm text-muted-foreground">{evento.fecha} · {evento.hora || "—"} · {evento.lugar || "—"}</p>
              {evento.descripcion && <p className="text-sm mt-2">{evento.descripcion}</p>}
            </div>
            <Badge variant={evento.estado === "publicado" ? "default" : "outline"}>{evento.estado}</Badge>
          </div>
        </CardContent>
      </Card>

      {ministerios.map((m) => {
        const cargosMin = cargos.filter((c) => c.ministerio_id === m.id);
        const asignsMin = asignsEvento.filter((a) => a.ministerio_id === m.id);
        const sugg = suggestionsFor(m.id);
        return (
          <Card key={m.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><span className="w-2 h-6 rounded-full" style={{ background: m.color || "#2563eb" }} />{m.nombre}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => autoAssign(m.id)}><Sparkles className="h-3.5 w-3.5 mr-1" />Auto-asignar</Button>
                <Dialog open={addOpen === m.id} onOpenChange={(o) => { setAddOpen(o ? m.id : null); setDraft({}); }}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Agregar</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Asignar servidor — {m.nombre}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm">Cargo</label>
                          <Select value={draft.cargo_id || ""} onValueChange={(v) => setDraft({ ...draft, cargo_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Sin cargo" /></SelectTrigger>
                            <SelectContent>{cargosMin.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="border-t pt-2 max-h-80 overflow-auto">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Sugerencias (menos servicios primero):</div>
                        {sugg.map((s) => {
                          const p: any = personasMap.get(s.persona_id);
                          if (!p) return null;
                          return (
                            <div key={s.id} className="flex items-center justify-between py-2 border-b">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{p.nombres?.[0]}{p.apellidos?.[0]}</AvatarFallback></Avatar>
                                <div>
                                  <div className="text-sm font-medium">{p.nombres} {p.apellidos}</div>
                                  <div className="text-[10px] text-muted-foreground">Servicios: {s.total} · Último: {s.lastFecha || "—"}</div>
                                </div>
                                {s.unavailable && <Badge variant="destructive" className="text-[10px]">No disponible</Badge>}
                              </div>
                              <Button size="sm" disabled={s.unavailable} onClick={() => addAsignacion(m.id, draft.cargo_id || null, s.persona_id)}>Asignar</Button>
                            </div>
                          );
                        })}
                        {sugg.length === 0 && <p className="text-sm text-muted-foreground">Sin servidores en este ministerio.</p>}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {asignsMin.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin asignaciones.</p>
              ) : (
                <div className="space-y-2">
                  {asignsMin.map((a) => {
                    const p: any = personasMap.get(a.persona_id);
                    const c = a.cargo_id ? cargosMap.get(a.cargo_id) : null;
                    if (!p) return null;
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-2 p-2 rounded-md border">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{p.nombres?.[0]}{p.apellidos?.[0]}</AvatarFallback></Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{p.nombres} {p.apellidos}</div>
                            <div className="flex gap-1.5 items-center text-xs text-muted-foreground">
                              {c && <Badge variant="secondary" className="text-[10px]">{c.nombre}</Badge>}
                              <Badge variant="outline" className="text-[10px]">{a.estado}</Badge>
                              {a.asistencia && <Badge className="text-[10px]">{a.asistencia}</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {p.whatsapp || p.telefono ? (
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="WhatsApp" onClick={() => {
                              const num = (p.whatsapp || p.telefono || "").replace(/\D/g, "");
                              const text = encodeURIComponent(`Hola ${p.nombres}, has sido programado para servir en ${m.nombre}${c ? " como " + c.nombre : ""} el ${evento.fecha}${evento.hora ? " a las " + evento.hora : ""}. ¿Puedes confirmar tu asistencia?`);
                              window.open(`https://wa.me/${num}?text=${text}`, "_blank");
                            }}><Phone className="h-3.5 w-3.5 text-green-600" /></Button>
                          ) : null}
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Confirmado" onClick={() => setEstadoAsig(a, "confirmado")}><Check className="h-3.5 w-3.5 text-green-600" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="No disponible" onClick={() => setEstadoAsig(a, "no_disponible")}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Solicita reemplazo" onClick={() => setEstadoAsig(a, "reemplazo")}><MessageSquare className="h-3.5 w-3.5 text-amber-600" /></Button>
                          <Select value={a.asistencia || ""} onValueChange={(v) => setAsistencia(a, v)}>
                            <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue placeholder="Asist." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="presente">Presente</SelectItem>
                              <SelectItem value="tarde">Tarde</SelectItem>
                              <SelectItem value="ausente">Ausente</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => delAsig.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
