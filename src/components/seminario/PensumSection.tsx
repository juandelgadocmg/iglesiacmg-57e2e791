import { useState } from "react";
import { useProgramas, useSemestres, useMateriasSem, usePensumMaterias, useAssignMateriaToSemestre, useUnassignMateriaFromSemestre, useUpsertMateria } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X, Pencil, FileDown, Layers } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import SectionHero from "@/components/shell/SectionHero";

export default function PensumSection({ readOnly = false }: { readOnly?: boolean }) {
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState<string>("");
  const effectiveId = programaId || programas?.[0]?.id || "";
  const { data: semestres } = useSemestres(effectiveId);
  const { data: materias } = useMateriasSem(effectiveId);
  const { data: pensum } = usePensumMaterias(effectiveId);
  const assign = useAssignMateriaToSemestre();
  const unassign = useUnassignMateriaFromSemestre();
  const upsertMateria = useUpsertMateria();
  const [addingFor, setAddingFor] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);

  const matsBySem = (semId: string) => (pensum || []).filter((p: any) => p.semestre_id === semId);
  const assignedIds = new Set((pensum || []).map((p: any) => p.materia_id));
  const unassigned = (materias || []).filter((m: any) => !assignedIds.has(m.id));

  const handleSaveEdit = async (form: any) => {
    try {
      await upsertMateria.mutateAsync({ ...form, programa_id: effectiveId });
      toast.success("Materia actualizada");
      setEditing(null);
    } catch (e: any) { toast.error(e.message); }
  };

  // Validar que cada materia esté en exactamente un semestre (unique constraint en BD ya lo asegura)
  const duplicadas = (pensum || []).reduce((acc: any, p: any) => {
    acc[p.materia_id] = (acc[p.materia_id] || 0) + 1;
    return acc;
  }, {});
  const hayDuplicadas = Object.values(duplicadas).some((c: any) => c > 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Malla Curricular</h2>
          <p className="text-xs text-muted-foreground">
            {readOnly ? "Consulta de materias por semestre" : "Edita materias y créditos directamente, o asígnalas a un semestre"}
          </p>
        </div>
        <Select value={effectiveId} onValueChange={setProgramaId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Programa" /></SelectTrigger>
          <SelectContent>
            {(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {hayDuplicadas && !readOnly && (
        <div className="text-xs p-2 rounded border border-destructive/40 bg-destructive/5 text-destructive">
          ⚠ Hay materias asignadas a más de un semestre. Verifique la malla.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(semestres || []).map((s: any) => {
          const items = matsBySem(s.id);
          const totCred = items.reduce((sum: number, it: any) => sum + (it.sem_materias?.creditos || 0), 0);
          const programaNombre = (programas || []).find((p: any) => p.id === effectiveId)?.nombre || "Programa";
          const exportPdf = () => {
            const doc = new jsPDF();
            doc.setFontSize(15);
            doc.text("Iglesia Cristiana CMG — Seminario Bíblico", 14, 16);
            doc.setFontSize(11);
            doc.text(`Pensum · ${programaNombre}`, 14, 24);
            doc.setFontSize(10);
            doc.text(`Semestre ${s.numero}${s.nombre ? " — " + s.nombre : ""}`, 14, 32);
            doc.text(`Total créditos: ${totCred}`, 14, 38);
            autoTable(doc, {
              startY: 44,
              head: [["Código", "Materia", "Créd.", "Horas", "Área"]],
              body: items.map((it: any) => [
                it.sem_materias?.codigo || "—",
                it.sem_materias?.nombre || "—",
                it.sem_materias?.creditos ?? "—",
                it.sem_materias?.intensidad_horaria ?? "—",
                it.sem_materias?.area || "—",
              ]),
              styles: { fontSize: 9 },
              headStyles: { fillColor: [37, 99, 235] },
            });
            doc.save(`pensum-sem${s.numero}-${programaNombre.replace(/\s+/g, "_")}.pdf`);
          };
          return (
            <Card key={s.id} className="min-h-[200px]">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Sem. {s.numero}</p>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">{totCred} cr</Badge>
                    <button onClick={exportPdf} title="Exportar pensum del semestre a PDF" className="text-muted-foreground hover:text-primary" disabled={items.length === 0}>
                      <FileDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {items.map((it: any) => (
                    <div key={it.id} className="group flex items-center gap-1.5 p-1.5 rounded text-[11px] border-l-2"
                      style={{ borderLeftColor: it.sem_materias?.color || "#3B82F6", background: `${it.sem_materias?.color || "#3B82F6"}10` }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{it.sem_materias?.nombre}</p>
                        <p className="text-[9px] text-muted-foreground">{it.sem_materias?.codigo} · {it.sem_materias?.creditos}cr</p>
                      </div>
                      {!readOnly && (
                        <>
                          <button onClick={() => setEditing(it.sem_materias)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground" title="Editar">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => unassign.mutateAsync(it.id).then(() => toast.success("Quitada"))} className="opacity-0 group-hover:opacity-100 text-destructive" title="Quitar de semestre">
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {!readOnly && (
                  <Button size="sm" variant="ghost" className="w-full h-7 text-[11px]" onClick={() => setAddingFor(s)}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar
                  </Button>
                )}
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

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        {editing && <MateriaQuickEdit initial={editing} onSave={handleSaveEdit} pending={upsertMateria.isPending} />}
      </Dialog>
    </div>
  );
}

function MateriaQuickEdit({ initial, onSave, pending }: any) {
  const [f, setF] = useState({
    id: initial.id, codigo: initial.codigo, nombre: initial.nombre,
    creditos: initial.creditos, color: initial.color || "#3B82F6",
    intensidad_horaria: initial.intensidad_horaria || 48,
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Editar materia</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Código *</Label><Input value={f.codigo} onChange={e => setF({ ...f, codigo: e.target.value })} /></div>
          <div><Label>Créditos *</Label><Input type="number" min={1} max={10} value={f.creditos} onChange={e => setF({ ...f, creditos: +e.target.value })} /></div>
          <div><Label>Horas</Label><Input type="number" value={f.intensidad_horaria} onChange={e => setF({ ...f, intensidad_horaria: +e.target.value })} /></div>
        </div>
        <div><Label>Nombre *</Label><Input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></div>
        <div><Label>Color</Label><Input type="color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} className="h-9 w-20" /></div>
        <Button onClick={() => onSave(f)} disabled={pending || !f.codigo || !f.nombre || !f.creditos} className="w-full">
          {pending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </DialogContent>
  );
}
