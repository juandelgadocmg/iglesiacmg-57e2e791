import { useState, useMemo } from "react";
import { useProgramas, useSemestres, usePensumMaterias, usePeriodos, useOfertas, useInscripciones, useUpsertInscripcion, useDeleteInscripcion, useInscripcionMaterias, useEnrollMateria, useUnenrollMateria, useUpdateInscripcionMateria, usePersonasLite } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, UserPlus, ChevronLeft, FileDown, Award, Video } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import ProgresoPanel from "./ProgresoPanel";
import { exportKardexPdf, exportKardexBatch, type KardexRow } from "@/lib/seminarioPdf";
import { supabase } from "@/integrations/supabase/client";
import { useCan } from "@/hooks/useCan";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown as FileDownIcon, Award as AwardIcon } from "lucide-react";
import { logSemAudit } from "@/lib/seminarioAudit";

export default function EstudiantesSection() {
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || programas?.[0]?.id || "";
  const programa = (programas || []).find((p: any) => p.id === effProg);
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useState("");
  const effPer = periodoId || periodos?.[0]?.id || "";
  const { data: inscripciones } = useInscripciones(effProg, effPer);
  const upsertIns = useUpsertInscripcion();
  const delIns = useDeleteInscripcion();
  const { data: personas } = usePersonasLite();
  const [creating, setCreating] = useState(false);
  const [selectedIns, setSelectedIns] = useState<any>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const can = useCan();
  const canMatricular = can("seminario:matricular");
  const canCertificar = can("seminario:certificar");

  // Estado de exportación masiva
  type BatchItem = { insId: string; nombre: string; status: "pendiente" | "procesando" | "ok" | "error" | "omitido"; error?: string; intentos?: number };
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchModo, setBatchModo] = useState<"kardex" | "certificado">("kardex");
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [maxIntentos, setMaxIntentos] = useState(3);
  const [autoRetry, setAutoRetry] = useState(true);
  const [batchFinalizado, setBatchFinalizado] = useState(false);

  const yaInscritos = new Set((inscripciones || []).map((i: any) => i.persona_id));

  const toggleSel = (id: string) => {
    setSeleccion(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const procesarItem = async (insId: string, modo: "kardex" | "certificado") => {
    const ins = (inscripciones || []).find((x: any) => x.id === insId);
    if (!ins) throw new Error("Inscripción no encontrada");
    const sb = supabase as any;
    const [{ data: pensum }, { data: cursando }, { data: semestres }] = await Promise.all([
      sb.from("sem_pensum_materias").select("materia_id, sem_pensum_semestres!inner(numero,programa_id), sem_materias(*)").eq("sem_pensum_semestres.programa_id", ins.programa_id),
      sb.from("sem_inscripcion_materias").select("materia_id, estado, nota_final, sem_materias(creditos)").eq("inscripcion_id", insId),
      sb.from("sem_pensum_semestres").select("numero").eq("programa_id", ins.programa_id).order("numero"),
    ]);
    const cmap = new Map((cursando || []).map((c: any) => [c.materia_id, c]));
    const aprob = (cursando || []).filter((c: any) => c.estado === "aprobada");
    const credAprob = aprob.reduce((s: number, c: any) => s + (c.sem_materias?.creditos || 0), 0);
    const totalPensum = (pensum || []).length;
    const aprobIds = new Set(aprob.map((c: any) => c.materia_id));
    const completo = totalPensum > 0 && (pensum || []).every((p: any) => aprobIds.has(p.materia_id));
    if (modo === "certificado" && !completo) {
      const err: any = new Error("No completa el pensum"); err.omitido = true; throw err;
    }
    const rows: KardexRow[] = [];
    (semestres || []).forEach((s: any) => {
      (pensum || []).filter((p: any) => p.sem_pensum_semestres.numero === s.numero).forEach((p: any) => {
        const c: any = cmap.get(p.materia_id);
        rows.push({ semestre: s.numero, codigo: p.sem_materias.codigo, nombre: p.sem_materias.nombre, creditos: p.sem_materias.creditos, estado: c?.estado || "no inscrita", nota_final: c?.nota_final ?? null });
      });
    });
    await exportKardexPdf({
      estudiante: `${ins.personas?.nombres} ${ins.personas?.apellidos}`,
      documento: ins.personas?.documento, programa: programa?.nombre || "—",
      promedio: ins.promedio_acumulado, creditosAprobados: credAprob, creditosTotales: (programa?.total_semestres || 8) * 20,
      rows, inscripcionId: insId, certificado: modo === "certificado",
    });
    await logSemAudit({
      action: modo === "certificado" ? "certificado.lote" : "kardex.descargado",
      persona_id: ins.persona_id, inscripcion_id: insId,
      details: { modo, programa: programa?.nombre, bulk: true },
    });
  };

  const ejecutarBatch = async (items: BatchItem[]) => {
    setBatchRunning(true);
    setBatchFinalizado(false);
    for (let i = 0; i < items.length; i++) {
      if (batchItems[i]?.status === "ok" || items[i].status === "ok" || items[i].status === "omitido") continue;
      setBatchItems(prev => prev.map((b, idx) => idx === i ? { ...b, status: "procesando", error: undefined } : b));
      try {
        await procesarItem(items[i].insId, batchModo);
        setBatchItems(prev => prev.map((b, idx) => idx === i ? { ...b, status: "ok", intentos: (b.intentos || 0) + 1 } : b));
      } catch (e: any) {
        setBatchItems(prev => prev.map((b, idx) => idx === i ? { ...b, status: e.omitido ? "omitido" : "error", error: e.message, intentos: (b.intentos || 0) + 1 } : b));
      }
      await new Promise(r => setTimeout(r, 200));
    }

    // Reintento automático con backoff exponencial
    if (autoRetry) {
      for (let intento = 2; intento <= maxIntentos; intento++) {
        const fallidos = await new Promise<BatchItem[]>(resolve => {
          setBatchItems(prev => { resolve(prev.filter(b => b.status === "error")); return prev; });
        });
        if (fallidos.length === 0) break;
        const delay = Math.min(30000, 1000 * Math.pow(2, intento - 1));
        toast.info(`Reintento ${intento}/${maxIntentos} en ${delay / 1000}s (${fallidos.length} fallidos)`);
        await new Promise(r => setTimeout(r, delay));
        const snapshot = await new Promise<BatchItem[]>(resolve => setBatchItems(prev => { resolve(prev); return prev; }));
        for (let i = 0; i < snapshot.length; i++) {
          if (snapshot[i].status !== "error") continue;
          setBatchItems(prev => prev.map((b, idx) => idx === i ? { ...b, status: "procesando" } : b));
          try {
            await procesarItem(snapshot[i].insId, batchModo);
            setBatchItems(prev => prev.map((b, idx) => idx === i ? { ...b, status: "ok", intentos: (b.intentos || 1) + 1 } : b));
          } catch (e: any) {
            setBatchItems(prev => prev.map((b, idx) => idx === i ? { ...b, status: e.omitido ? "omitido" : "error", error: e.message, intentos: (b.intentos || 1) + 1 } : b));
          }
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }
    setBatchRunning(false);
    setBatchFinalizado(true);
  };

  const exportarLote = async (modo: "kardex" | "certificado" = "kardex") => {
    const ids = Array.from(seleccion);
    if (!ids.length) { toast.error("Selecciona al menos un estudiante"); return; }
    if (modo === "certificado" && !canCertificar) { toast.error("No tienes permiso para emitir certificados."); return; }
    const initial: BatchItem[] = ids.map(id => {
      const ins = (inscripciones || []).find((x: any) => x.id === id);
      return { insId: id, nombre: ins ? `${ins.personas?.nombres} ${ins.personas?.apellidos}` : id, status: "pendiente", intentos: 0 };
    });
    setBatchModo(modo); setBatchItems(initial); setBatchOpen(true); setBatchFinalizado(false);
    await ejecutarBatch(initial);
  };

  const reintentarFallidos = async () => {
    const items = batchItems.map(b => b.status === "error" ? { ...b, status: "pendiente" as const, error: undefined } : b);
    setBatchItems(items);
    await ejecutarBatch(items);
  };

  const descargarReporte = () => {
    const total = batchItems.length;
    const ok = batchItems.filter(b => b.status === "ok").length;
    const err = batchItems.filter(b => b.status === "error").length;
    const skip = batchItems.filter(b => b.status === "omitido").length;
    const headers = ["Estudiante", "Estado", "Intentos", "Error"];
    const lines = [headers.join(",")];
    lines.push(`"RESUMEN","Total: ${total} · OK: ${ok} · Errores: ${err} · Omitidos: ${skip}","",""`);
    lines.push("");
    batchItems.forEach(b => {
      const row = [b.nombre, b.status, String(b.intentos || 0), (b.error || "").replace(/"/g, '""')]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      lines.push(row);
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_${batchModo}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reporte descargado");
  };

  const handleCreate = async (form: any) => {
    try {
      const res: any = await upsertIns.mutateAsync({ ...form, programa_id: effProg, periodo_id: effPer, estado: "activa" });
      toast.success("Estudiante inscrito");
      setCreating(false);
      await logSemAudit({
        action: "inscripcion.creada", persona_id: form.persona_id,
        inscripcion_id: res?.id, details: { programa_id: effProg, periodo_id: effPer, semestre: form.semestre_actual },
      });
    } catch (e: any) { toast.error(e.message); }
  };

  if (selectedIns) {
    return <EstudianteDetalle ins={selectedIns} programa={programa} onBack={() => setSelectedIns(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Estudiantes Inscritos</h2>
          <p className="text-xs text-muted-foreground">Inscribe estudiantes por semestre y registra avance académico</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={effProg} onValueChange={setProgramaId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>{(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effPer} onValueChange={setPeriodoId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>{(periodos || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          {seleccion.size > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => exportarLote("kardex")}>
                <FileDownIcon className="h-4 w-4 mr-1" />Exportar {seleccion.size} kárdex
              </Button>
              {canCertificar && (
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => exportarLote("certificado")}>
                  <AwardIcon className="h-4 w-4 mr-1" />Certificados ({seleccion.size})
                </Button>
              )}
            </>
          )}
          {canMatricular && (
            <Dialog open={creating} onOpenChange={setCreating}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!effPer}><UserPlus className="h-4 w-4 mr-1" />Inscribir</Button>
              </DialogTrigger>
              <InscripcionDialog personas={(personas || []).filter((p: any) => !yaInscritos.has(p.id))}
                totalSem={programa?.total_semestres || 8}
                onSave={handleCreate} pending={upsertIns.isPending} />
            </Dialog>
          )}
        </div>
      </div>

      {!effPer ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Selecciona o crea un periodo en la pestaña Horarios.</CardContent></Card>
      ) : (inscripciones || []).length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No hay estudiantes inscritos en este periodo.</CardContent></Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {(inscripciones || []).map((i: any) => {
            const p = i.personas;
            const credAprob = i.total_creditos_aprobados || 0;
            const totalProg = (programa?.total_semestres || 8) * 20;
            const pct = Math.min(100, Math.round((credAprob / totalProg) * 100));
            return (
              <Card key={i.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={seleccion.has(i.id)} onCheckedChange={() => toggleSel(i.id)}
                      onClick={(e) => e.stopPropagation()} className="mt-1" />
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold cursor-pointer" onClick={() => setSelectedIns(i)}>
                      {p?.nombres?.[0]}{p?.apellidos?.[0]}
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedIns(i)}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{p?.nombres} {p?.apellidos}</p>
                        <Badge variant="outline" className="text-[10px]">Sem {i.semestre_actual || "—"}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{p?.documento}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{credAprob} cr · {pct}%</span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground">Promedio: {i.promedio_acumulado ?? "—"}</span>
                        <DeleteConfirmDialog onConfirm={async () => { await delIns.mutateAsync(i.id); await logSemAudit({ action: "inscripcion.eliminada", persona_id: i.persona_id, inscripcion_id: i.id }); toast.success("Eliminado"); }}
                          trigger={<Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => e.stopPropagation()}><Trash2 className="h-3 w-3" /></Button>} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Diálogo de progreso de exportación masiva */}
      <Dialog open={batchOpen} onOpenChange={(o) => { if (!batchRunning) setBatchOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{batchModo === "certificado" ? "Generando certificados" : "Generando kárdex"}</DialogTitle>
          </DialogHeader>
          {(() => {
            const total = batchItems.length;
            const done = batchItems.filter(b => b.status === "ok").length;
            const err = batchItems.filter(b => b.status === "error").length;
            const skip = batchItems.filter(b => b.status === "omitido").length;
            const pct = total ? Math.round(((done + err + skip) / total) * 100) : 0;
            return (
              <div className="space-y-3">
                <Progress value={pct} className="h-2" />
                <div className="flex justify-between text-xs">
                  <span>{done + err + skip} / {total}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-green-700 border-green-600">{done} ok</Badge>
                    {skip > 0 && <Badge variant="outline" className="text-amber-700 border-amber-600">{skip} omitidos</Badge>}
                    {err > 0 && <Badge variant="destructive">{err} errores</Badge>}
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto border rounded text-xs divide-y">
                  {batchItems.map(b => (
                    <div key={b.insId} className="flex items-center justify-between gap-2 px-2 py-1.5">
                      <span className="truncate">{b.nombre}</span>
                      <span className={
                        b.status === "ok" ? "text-green-600" :
                        b.status === "error" ? "text-destructive" :
                        b.status === "omitido" ? "text-amber-600" :
                        b.status === "procesando" ? "text-primary" : "text-muted-foreground"
                      }>
                        {b.status === "ok" && "✓ Generado"}
                        {b.status === "error" && `✗ ${b.error || "Error"}`}
                        {b.status === "omitido" && `⊘ ${b.error || "Omitido"}`}
                        {b.status === "procesando" && "Procesando…"}
                        {b.status === "pendiente" && "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  {err > 0 && !batchRunning && (
                    <Button size="sm" variant="outline" onClick={reintentarFallidos}>
                      Reintentar {err} fallidos
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={batchRunning} onClick={() => setBatchOpen(false)}>
                    {batchRunning ? "Procesando…" : "Cerrar"}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InscripcionDialog({ personas, totalSem, onSave, pending }: any) {
  const [f, setF] = useState({ persona_id: "", semestre_actual: 1 });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nueva inscripción</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Persona *</Label>
          <Select value={f.persona_id} onValueChange={(v) => setF({ ...f, persona_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {personas.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombres} {p.apellidos} {p.documento && `· ${p.documento}`}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Semestre a cursar *</Label>
          <Select value={String(f.semestre_actual)} onValueChange={(v) => setF({ ...f, semestre_actual: +v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalSem }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>Semestre {n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => onSave(f)} disabled={pending || !f.persona_id} className="w-full">
          {pending ? "Guardando..." : "Inscribir"}
        </Button>
      </div>
    </DialogContent>
  );
}

function EstudianteDetalle({ ins, programa, onBack }: any) {
  const { data: semestres } = useSemestres(ins.programa_id);
  const { data: pensum } = usePensumMaterias(ins.programa_id);
  const { data: ofertas } = useOfertas(ins.periodo_id, ins.programa_id);
  const { data: cursando } = useInscripcionMaterias(ins.id);
  const enroll = useEnrollMateria();
  const unenroll = useUnenrollMateria();
  const updateIns = useUpdateInscripcionMateria();
  const can = useCan();
  const canMatricular = can("seminario:matricular");
  const canCertificar = can("seminario:certificar");

  const matsBySem = useMemo(() => {
    const map: Record<number, any[]> = {};
    (pensum || []).forEach((p: any) => {
      const n = p.sem_pensum_semestres?.numero;
      if (!n) return;
      (map[n] = map[n] || []).push(p.sem_materias);
    });
    return map;
  }, [pensum]);

  const cursandoMap = new Map((cursando || []).map((c: any) => [c.materia_id, c]));
  const totalCreditos = (programa?.total_semestres || 8) * 20;
  const aprobadas = (cursando || []).filter((c: any) => c.estado === "aprobada");
  const credAprob = aprobadas.reduce((s: number, c: any) => s + (c.sem_materias?.creditos || 0), 0);
  const pct = Math.min(100, Math.round((credAprob / totalCreditos) * 100));

  // Programa completo: todas las materias del pensum aprobadas
  const totalPensum = (pensum || []).length;
  const aprobadasIds = new Set(aprobadas.map((c: any) => c.materia_id));
  const programaCompleto = totalPensum > 0 && (pensum || []).every((p: any) => aprobadasIds.has(p.materia_id));

  const handleEnroll = async (materia_id: string) => {
    if (!canMatricular) { toast.error("No tienes permiso para matricular materias."); return; }
    const oferta = (ofertas || []).find((o: any) => o.materia_id === materia_id);
    if (!oferta) { toast.error("Esta materia no tiene oferta en el periodo. Crea horario primero."); return; }
    try {
      const { data: ok, error } = await (supabase as any).rpc("sem_puede_inscribir", {
        _persona_id: ins.persona_id, _materia_id: materia_id,
      });
      if (error) throw error;
      if (!ok) { toast.error("No cumple prerrequisitos del pensum para esta materia."); return; }
      await enroll.mutateAsync({ inscripcion_id: ins.id, oferta_id: oferta.id, materia_id });
      toast.success("Matriculada");
      await logSemAudit({ action: "matricula.creada", persona_id: ins.persona_id, inscripcion_id: ins.id, oferta_id: oferta.id, materia_id });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdate = async (id: string, patch: any) => {
    try { await updateIns.mutateAsync({ id, ...patch }); toast.success("Actualizado"); }
    catch (e: any) { toast.error(e.message); }
  };

  const buildKardexRows = () => {
    const rows: any[] = [];
    (semestres || []).forEach((s: any) => {
      (matsBySem[s.numero] || []).forEach((m: any) => {
        const c: any = cursandoMap.get(m.id);
        rows.push({
          semestre: s.numero, codigo: m.codigo, nombre: m.nombre, creditos: m.creditos,
          estado: c?.estado || "no inscrita", nota_final: c?.nota_final ?? null,
        });
      });
    });
    return rows;
  };

  const handleKardex = async (certificado: boolean) => {
    if (certificado && !canCertificar) { toast.error("No tienes permiso para emitir certificados."); return; }
    await exportKardexPdf({
      estudiante: `${p?.nombres} ${p?.apellidos}`,
      documento: p?.documento, programa: programa?.nombre || "—",
      promedio: ins.promedio_acumulado, creditosAprobados: credAprob, creditosTotales: totalCreditos,
      rows: buildKardexRows(), certificado, inscripcionId: ins.id,
    });
    await logSemAudit({
      action: certificado ? "certificado.generado" : "kardex.descargado",
      persona_id: ins.persona_id, inscripcion_id: ins.id,
      details: { programa: programa?.nombre, promedio: ins.promedio_acumulado, creditos_aprobados: credAprob },
    });
  };

  const p = ins.personas;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" variant="ghost" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" />Volver</Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleKardex(false)}>
            <FileDown className="h-4 w-4 mr-1" />Kárdex PDF
          </Button>
          {programaCompleto && canCertificar && (
            <Button size="sm" onClick={() => handleKardex(true)} className="bg-amber-600 hover:bg-amber-700">
              <Award className="h-4 w-4 mr-1" />Generar Certificado
            </Button>
          )}
        </div>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              {p?.nombres?.[0]}{p?.apellidos?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{p?.nombres} {p?.apellidos}</p>
              <p className="text-xs text-muted-foreground">{p?.documento} · {programa?.nombre}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge variant="outline">Semestre {ins.semestre_actual}</Badge>
                <Badge variant="outline">Promedio {ins.promedio_acumulado ?? "—"}</Badge>
                <Badge variant="outline">{credAprob}/{totalCreditos} créditos</Badge>
                {programaCompleto && <Badge className="bg-amber-600">✓ Programa completo</Badge>}
              </div>
            </div>
            <div className="w-full md:w-48">
              <p className="text-[10px] text-muted-foreground mb-1">Avance del programa</p>
              <Progress value={pct} className="h-2" />
              <p className="text-[10px] text-right mt-1">{pct}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProgresoPanel semestres={semestres || []} pensum={pensum || []} cursando={cursando || []} semestreActual={ins.semestre_actual || 1} />

      <div className="space-y-3">
        {(semestres || []).map((s: any) => {
          const mats = matsBySem[s.numero] || [];
          if (!mats.length) return null;
          return (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Semestre {s.numero}</p>
                  {s.numero === ins.semestre_actual && <Badge>Actual</Badge>}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {mats.map((m: any) => {
                    const c: any = cursandoMap.get(m.id);
                    return (
                      <div key={m.id} className="border rounded p-2 text-xs" style={{ borderLeftColor: m.color, borderLeftWidth: 3 }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{m.nombre}</p>
                            <p className="text-[10px] text-muted-foreground">{m.codigo} · {m.creditos}cr</p>
                          </div>
                          {!c ? (
                            canMatricular ? (
                              <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => handleEnroll(m.id)}>
                                <Plus className="h-3 w-3 mr-0.5" />Matricular
                              </Button>
                            ) : null
                          ) : (
                            <DeleteConfirmDialog onConfirm={async () => { await unenroll.mutateAsync(c.id); toast.success("Retirada"); }}
                              trigger={<Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>} />
                          )}
                        </div>
                        {c && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <Select value={c.estado} onValueChange={(v) => handleUpdate(c.id, { estado: v })}>
                              <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cursando">Cursando</SelectItem>
                                <SelectItem value="aprobada">Aprobada</SelectItem>
                                <SelectItem value="reprobada">Reprobada</SelectItem>
                                <SelectItem value="cancelada">Cancelada</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input type="number" step="0.1" min="0" max="5" placeholder="Nota"
                              defaultValue={c.nota_final ?? ""}
                              onBlur={(e) => {
                                const n = e.target.value === "" ? null : +e.target.value;
                                if (n !== c.nota_final) handleUpdate(c.id, { nota_final: n });
                              }}
                              className="h-7 w-20 text-[10px]" />
                          </div>
                        )}
                        {c?.sem_ofertas?.zoom_link && (
                          <a href={c.sem_ofertas.zoom_link} target="_blank" rel="noopener noreferrer"
                            className="mt-1.5 flex items-center gap-1 text-[10px] text-primary hover:underline">
                            <Video className="h-3 w-3" />Aula virtual Zoom
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
