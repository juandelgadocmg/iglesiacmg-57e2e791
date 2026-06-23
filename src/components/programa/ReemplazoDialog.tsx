import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUpsertReemplazo, useUpsertAsignacion, useProgServidores, useAsignacionesPorPersona, useProgAsignaciones, logProgAction } from "@/hooks/usePrograma";
import { usePersonas } from "@/hooks/useDatabase";

export default function ReemplazoDialog({ open, onOpenChange, asignacion, evento, ministerio, cargo }: any) {
  const [motivo, setMotivo] = useState("");
  const [candidato, setCandidato] = useState<string>("");
  const up = useUpsertReemplazo();
  const upAsig = useUpsertAsignacion();
  const { data: servidores = [] } = useProgServidores();
  const { data: personas = [] } = usePersonas();
  const { data: asigs = [] } = useProgAsignaciones();
  const stats = useAsignacionesPorPersona();

  if (!asignacion) return null;
  const personasMap = new Map(personas.map((p: any) => [p.id, p]));
  const ocupados = new Set(asigs.filter((a) => a.evento_id === evento.id).map((a) => a.persona_id));
  const candidatos = servidores
    .filter((s) => s.ministerio_id === asignacion.ministerio_id && s.activo && s.persona_id !== asignacion.persona_id && !ocupados.has(s.persona_id))
    .map((s) => ({ ...s, total: stats.get(s.persona_id)?.total || 0 }))
    .sort((a, b) => a.total - b.total);

  const persona: any = personasMap.get(asignacion.persona_id);

  const submit = async () => {
    if (!motivo.trim()) return toast.error("Indica el motivo del reemplazo");
    try {
      const rem = await up.mutateAsync({
        asignacion_id: asignacion.id,
        evento_id: evento.id,
        ministerio_id: asignacion.ministerio_id,
        cargo_id: asignacion.cargo_id,
        persona_solicita_id: asignacion.persona_id,
        persona_reemplazo_id: candidato || null,
        motivo,
        estado: "pendiente",
      });
      await upAsig.mutateAsync({ id: asignacion.id, estado: "reemplazo" });
      await logProgAction({
        evento_id: evento.id, asignacion_id: asignacion.id, action: "reemplazo_solicitado",
        details: { persona_nombre: persona ? `${persona.nombres} ${persona.apellidos}` : "—", ministerio_nombre: ministerio?.nombre, cargo_nombre: cargo?.nombre, motivo, candidato_sugerido_id: candidato || null, reemplazo_id: (rem as any)?.id }
      });
      toast.success("Solicitud de reemplazo enviada al líder");
      onOpenChange(false);
      setMotivo(""); setCandidato("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Solicitar reemplazo</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">{persona?.nombres} {persona?.apellidos} en {ministerio?.nombre}{cargo ? ` — ${cargo.nombre}` : ""} ({evento.fecha})</p>
          <div>
            <Label>Motivo *</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Indica brevemente la razón…" />
          </div>
          <div>
            <Label>Sugerir reemplazo (opcional)</Label>
            <Select value={candidato} onValueChange={setCandidato}>
              <SelectTrigger><SelectValue placeholder="Auto-sugerir" /></SelectTrigger>
              <SelectContent>
                {candidatos.map((c) => {
                  const p: any = personasMap.get(c.persona_id);
                  return <SelectItem key={c.id} value={c.persona_id}>{p?.nombres} {p?.apellidos} · {c.total} servicios</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Enviar solicitud</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
