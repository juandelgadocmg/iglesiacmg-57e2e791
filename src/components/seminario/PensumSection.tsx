import { useState } from "react";
import { useProgramas, useSemestres, useMateriasSem, usePensumMaterias, useAssignMateriaToSemestre, useUnassignMateriaFromSemestre } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function PensumSection() {
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState<string>("");
  const effectiveId = programaId || programas?.[0]?.id || "";
  const { data: semestres } = useSemestres(effectiveId);
  const { data: materias } = useMateriasSem(effectiveId);
  const { data: pensum } = usePensumMaterias(effectiveId);
  const assign = useAssignMateriaToSemestre();
  const unassign = useUnassignMateriaFromSemestre();
  const [addingFor, setAddingFor] = useState<any>(null);

  const matsBySem = (semId: string) => (pensum || []).filter((p: any) => p.semestre_id === semId);
  const assignedIds = new Set((pensum || []).map((p: any) => p.materia_id));
  const unassigned = (materias || []).filter((m: any) => !assignedIds.has(m.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Malla Curricular</h2>
          <p className="text-xs text-muted-foreground">Asigna materias a cada semestre del programa</p>
        </div>
        <Select value={effectiveId} onValueChange={setProgramaId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Programa" /></SelectTrigger>
          <SelectContent>
            {(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(semestres || []).map((s: any) => {
          const items = matsBySem(s.id);
          const totCred = items.reduce((sum: number, it: any) => sum + (it.sem_materias?.creditos || 0), 0);
          return (
            <Card key={s.id} className="min-h-[200px]">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Sem. {s.numero}</p>
                  <Badge variant="outline" className="text-[10px]">{totCred} cr</Badge>
                </div>
                <div className="space-y-1.5">
                  {items.map((it: any) => (
                    <div key={it.id} className="group flex items-center gap-1.5 p-1.5 rounded text-[11px] border-l-2"
                      style={{ borderLeftColor: it.sem_materias?.color || "#3B82F6", background: `${it.sem_materias?.color || "#3B82F6"}10` }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{it.sem_materias?.nombre}</p>
                        <p className="text-[9px] text-muted-foreground">{it.sem_materias?.codigo} · {it.sem_materias?.creditos}cr</p>
                      </div>
                      <button onClick={() => unassign.mutateAsync(it.id)} className="opacity-0 group-hover:opacity-100 text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="w-full h-7 text-[11px]" onClick={() => setAddingFor(s)}>
                  <Plus className="h-3 w-3 mr-1" /> Agregar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!addingFor} onOpenChange={(v) => !v && setAddingFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar materia a Sem. {addingFor?.numero}</DialogTitle></DialogHeader>
          {unassigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todas las materias del programa ya están asignadas. Crea una nueva en la pestaña "Materias".</p>
          ) : (
            <Select onValueChange={(v) => assign.mutateAsync({ semestre_id: addingFor.id, materia_id: v }).then(() => { toast.success("Asignada"); setAddingFor(null); })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar materia" /></SelectTrigger>
              <SelectContent>
                {unassigned.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.codigo} — {m.nombre} ({m.creditos}cr)</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
