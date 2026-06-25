import { useState, useMemo } from "react";
import { useProgramas, useSemestres, usePensumMaterias, usePeriodos, useOfertas, useInscripciones, useUpsertInscripcion, useDeleteInscripcion, useInscripcionMaterias, useEnrollMateria, useUnenrollMateria, useUpdateInscripcionMateria, usePersonasLite, useEstudianteHistorial } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, UserPlus, ChevronLeft, FileDown, Award, Video, Search } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import ProgresoPanel from "./ProgresoPanel";
import { exportKardexPdf, exportKardexBatch, type KardexRow } from "@/lib/seminarioPdf";
import { supabase } from "@/integrations/supabase/client";
import { useCan } from "@/hooks/useCan";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown as FileDownIcon, Award as AwardIcon } from "lucide-react";
import { logSemAudit } from "@/lib/seminarioAudit";
import SearchableCombobox from "./SearchableCombobox";
import { matchesPersona } from "@/lib/seminarioSearch";
import { yaInscritoBadge, periodoLabel, personaFullName } from "@/lib/seminarioFormat";

export default function EstudiantesSection() {
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || programas?.[0]?.id || "";
  const programa = (programas || []).find((p: any) => p.id === effProg);
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useState("");
  const effPer = periodoId || periodos?.[0]?.id || "";
  const { data: inscripciones } = useInscripciones(effProg, effPer);
  // Todas las inscripciones del programa (todos los periodos) para detectar "Ya inscrito"
  const { data: inscripcionesPrograma } = useInscripciones(effProg);
  const upsertIns = useUpsertInscripcion();
  const delIns = useDeleteInscripcion();
  const { data: personas } = usePersonasLite();
  const [creating, setCreating] = useState(false);
  const [selectedIns, setSelectedIns] = useState<any>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [anioIngreso, setAnioIngreso] = useState<string>("_all");
  const [incluirYaInscritos, setIncluirYaInscritos] = useState(true);
  const can = useCan();
  const canMatricular = can("seminario:matricular");
  const canCertificar = can("seminario:certificar");

  // Cambiar de programa resetea periodo, selección y búsqueda para evitar estado inconsistente
  const handleProgramaChange = (v: string) => {
    setProgramaId(v);
    setPeriodoId("");
    setSeleccion(new Set());
  };
  const handlePeriodoChange = (v: string) => {
    setPeriodoId(v);
    setSeleccion(new Set());
  };

  // Estado de exportación masiva
  type BatchItem = { insId: string; nombre: string; status: "pendiente" | "procesando" | "ok" | "error" | "omitido"; error?: string; intentos?: number };
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchModo, setBatchModo] = useState<"kardex" | "certificado">("kardex");
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [maxIntentos, setMaxIntentos] = useState(3);
  const [autoRetry, setAutoRetry] = useState(true);
  const [batchFinalizado, setBatchFinalizado] = useState(false);

  // Mapa enriquecido: persona_id -> { inscripcion, periodoNombre } a través de todos los periodos del programa
  const yaInscritosMap = useMemo(() => {
    const m = new Map<string, { ins: any; periodoNombre: string; badge: string }>();
    (inscripcionesPrograma || []).forEach((i: any) => {
      m.set(i.persona_id, {
        ins: i,
        periodoNombre: periodoLabel(i.sem_periodos),
        badge: yaInscritoBadge(i.sem_periodos),
      });
    });
    return m;
  }, [inscripcionesPrograma]);

  // Compatibilidad con código existente (solo periodo actual)
  const yaInscritos = new Set((inscripciones || []).map((i: any) => i.persona_id));

  // Inscripciones filtradas por nombre/CC y año de ingreso
  const inscripcionesFiltradas = useMemo(() => {
    let rows = inscripciones || [];
    if (anioIngreso !== "_all") {
      rows = rows.filter((i: any) => String(i.anio_ingreso ?? "") === anioIngreso);
    }
    if (busqueda.trim()) {
      rows = rows.filter((i: any) => matchesPersona(busqueda, i.personas || {}));
    }
    return rows;
  }, [inscripciones, busqueda, anioIngreso]);

  // Años de ingreso disponibles (de las inscripciones del periodo actual + programa)
  const aniosDisponibles = useMemo(() => {
    const s = new Set<number>();
    (inscripcionesPrograma || []).forEach((i: any) => { if (i.anio_ingreso) s.add(i.anio_ingreso); });
    return Array.from(s).sort((a, b) => b - a);
  }, [inscripcionesPrograma]);

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
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o CC..."
              className="pl-8 w-56"
            />
          </div>
          <Select value={effProg} onValueChange={handleProgramaChange}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>{(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effPer} onValueChange={handlePeriodoChange}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>{(periodos || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={anioIngreso} onValueChange={setAnioIngreso}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Año de ingreso" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos los años</SelectItem>
              {aniosDisponibles.map(a => <SelectItem key={a} value={String(a)}>Ingreso {a}</SelectItem>)}
            </SelectContent>
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
              <InscripcionDialog
                personas={personas || []}
                yaInscritosMap={yaInscritosMap}
                inscritosPeriodoActual={yaInscritos}
                periodoActualNombre={periodoLabel((periodos || []).find((p: any) => p.id === effPer))}
                incluirYaInscritos={incluirYaInscritos}
                setIncluirYaInscritos={setIncluirYaInscritos}
                onVerInscripcion={(ins: any) => { setCreating(false); setSelectedIns(ins); }}
                totalSem={programa?.total_semestres || 8}
                onSave={handleCreate}
                pending={upsertIns.isPending}
              />
            </Dialog>
          )}
        </div>
      </div>

      {!effPer ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Selecciona o crea un periodo en la pestaña Horarios.</CardContent></Card>
      ) : (inscripciones || []).length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No hay estudiantes inscritos en este periodo.</CardContent></Card>
      ) : inscripcionesFiltradas.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Ningún estudiante coincide con "{busqueda}" en este programa y periodo.</CardContent></Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {inscripcionesFiltradas.map((i: any) => {
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
                        <p className="font-semibold text-sm truncate">{personaFullName(p)}</p>
                        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                          <Badge variant="outline" className="text-[10px]">Sem {i.semestre_actual || "—"}</Badge>
                          {i.anio_ingreso && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                              aria-label={`Ingreso original ${i.anio_ingreso}${i.periodo_ingreso?.nombre ? ` (${i.periodo_ingreso.nombre})` : ""}`}
                              title={i.periodo_ingreso?.nombre ? `Periodo de ingreso: ${i.periodo_ingreso.nombre}` : undefined}
                            >
                              Ingreso {i.anio_ingreso}
                            </Badge>
                          )}
                          <Badge
                            className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-100"
                            aria-label={`${yaInscritoBadge(i.sem_periodos)} en el programa ${programa?.nombre || ""}`.trim()}
                          >
                            {yaInscritoBadge(i.sem_periodos)}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{p?.documento}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{credAprob} cr · {pct}%</span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5 gap-2">
                        <span className="text-[10px] text-muted-foreground">Promedio: {i.promedio_acumulado ?? "—"}</span>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                            onClick={(e) => { e.stopPropagation(); setSelectedIns(i); }}>
                            Ver inscripción
                          </Button>
                          <DeleteConfirmDialog onConfirm={async () => { await delIns.mutateAsync(i.id); await logSemAudit({ action: "inscripcion.eliminada", persona_id: i.persona_id, inscripcion_id: i.id }); toast.success("Eliminado"); }}
                            trigger={<Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => e.stopPropagation()}><Trash2 className="h-3 w-3" /></Button>} />
                        </div>
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
                <div className="flex items-center justify-between gap-3 text-xs border rounded p-2 bg-muted/30">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={autoRetry} onChange={e => setAutoRetry(e.target.checked)} disabled={batchRunning} />
                    Reintento automático con backoff
                  </label>
                  <label className="flex items-center gap-2">
                    Máx intentos:
                    <input type="number" min={1} max={10} value={maxIntentos}
                      onChange={e => setMaxIntentos(Math.max(1, Math.min(10, +e.target.value || 1)))}
                      disabled={batchRunning} className="w-14 h-7 border rounded px-2" />
                  </label>
                </div>
                <div className="max-h-64 overflow-y-auto border rounded text-xs divide-y">
                  {batchItems.map(b => (
                    <div key={b.insId} className="flex items-center justify-between gap-2 px-2 py-1.5">
                      <span className="truncate">{b.nombre} {b.intentos && b.intentos > 1 ? <span className="text-muted-foreground">·{b.intentos}x</span> : null}</span>
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
                <div className="flex justify-end gap-2 flex-wrap">
                  {batchFinalizado && batchItems.length > 0 && (
                    <Button size="sm" variant="outline" onClick={descargarReporte}>
                      <FileDownIcon className="h-3.5 w-3.5 mr-1" />Descargar reporte
                    </Button>
                  )}
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

function InscripcionDialog({ personas, yaInscritosMap, incluirYaInscritos, setIncluirYaInscritos, onVerInscripcion, totalSem, onSave, pending }: any) {
  const [f, setF] = useState({ persona_id: "", semestre_actual: 1 });
  const map: Map<string, { ins: any; periodoNombre: string; badge: string }> = yaInscritosMap || new Map();

  const items = useMemo(() => {
    const base = (personas || []).map((p: any) => {
      const info = map.get(p.id);
      const inscrita = !!info;
      const fullName = personaFullName(p);
      return {
        id: p.id,
        label: fullName,
        sub: inscrita
          ? `${p.documento || "—"} · Inscrito en ${info!.periodoNombre}`
          : (p.documento || undefined),
        disabled: inscrita,
        badge: inscrita ? info!.badge : undefined,
        ariaLabel: inscrita
          ? `${fullName}, ${info!.badge}. No disponible para nueva inscripción.`
          : `${fullName}${p.documento ? `, documento ${p.documento}` : ""}`,
        action: inscrita
          ? { label: "Ver inscripción", onClick: () => onVerInscripcion?.(info!.ins), ariaLabel: `Ver inscripción de ${fullName} en ${info!.periodoNombre}` }
          : undefined,
        _inscrita: inscrita,
      };
    });
    return incluirYaInscritos ? base : base.filter((i: any) => !i._inscrita);
  }, [personas, map, incluirYaInscritos, onVerInscripcion]);

  const totalInscritos = useMemo(
    () => (personas || []).filter((p: any) => map.has(p.id)).length,
    [personas, map]
  );

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nueva inscripción</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Persona *</Label>
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={!!incluirYaInscritos}
                onChange={(e) => setIncluirYaInscritos?.(e.target.checked)}
              />
              {incluirYaInscritos
                ? `Toda la membresía · incluye inscritos (${totalInscritos})`
                : `Solo disponibles · oculta inscritos (${totalInscritos})`}
            </label>
          </div>
          <SearchableCombobox
            width="w-full"
            value={f.persona_id}
            onChange={(v) => setF({ ...f, persona_id: v })}
            placeholder="Buscar persona por nombre o documento…"
            emptyLabel="No hay personas disponibles"
            items={items}
          />
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

      <HistorialEstudiantePanel personaId={ins.persona_id} programaId={ins.programa_id} currentInscripcionId={ins.id} />

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

function HistorialEstudiantePanel({ personaId, programaId, currentInscripcionId }: { personaId: string; programaId: string; currentInscripcionId: string }) {
  const { data: historial = [], isLoading } = useEstudianteHistorial(personaId, programaId);

  const exportarHistorial = (formato: "csv" | "pdf") => {
    const rows: any[] = [];
    (historial as any[]).forEach((insc: any) => {
      const periodoNombre = insc.sem_periodos?.nombre || insc.sem_periodos?.codigo || "—";
      (insc.sem_inscripcion_materias || []).forEach((m: any) => {
        rows.push({
          periodo: periodoNombre,
          anio: insc.anio_ingreso || "",
          codigo: m.sem_materias?.codigo || "",
          materia: m.sem_materias?.nombre || "",
          creditos: m.sem_materias?.creditos || 0,
          estado: m.estado || "",
          nota: m.nota_final ?? "",
        });
      });
    });
    if (!rows.length) { toast.error("Sin historial para exportar"); return; }

    if (formato === "csv") {
      const headers = ["Periodo", "Año ingreso", "Código", "Materia", "Créditos", "Estado", "Nota"];
      const lines = [headers.join(",")];
      rows.forEach(r => {
        lines.push([r.periodo, r.anio, r.codigo, r.materia, r.creditos, r.estado, r.nota]
          .map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
      });
      const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `historial_${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Historial CSV descargado");
    } else {
      import("jspdf").then(({ default: jsPDF }) => import("jspdf-autotable").then(({ default: autoTable }) => {
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(14); doc.text("Historial académico por periodo", 14, 14);
        doc.setFontSize(9); doc.text(`Generado ${new Date().toLocaleString("es-CO")}`, 14, 20);
        autoTable(doc, {
          startY: 26,
          head: [["Periodo", "Código", "Materia", "Cr.", "Estado", "Nota"]],
          body: rows.map(r => [r.periodo, r.codigo, r.materia, r.creditos, r.estado, r.nota]),
          styles: { fontSize: 8 }, headStyles: { fillColor: [37, 99, 235] },
        });
        doc.save(`historial_${Date.now()}.pdf`);
        toast.success("Historial PDF descargado");
      }));
    }
  };

  if (isLoading) return <Card><CardContent className="p-4 text-xs text-muted-foreground">Cargando historial...</CardContent></Card>;
  if (!historial.length) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="font-semibold text-sm">Historial por periodo</p>
            <p className="text-[10px] text-muted-foreground">{historial.length} periodo{historial.length > 1 ? "s" : ""} cursado{historial.length > 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportarHistorial("csv")}><FileDownIcon className="h-3.5 w-3.5 mr-1" />CSV</Button>
            <Button size="sm" variant="outline" onClick={() => exportarHistorial("pdf")}><FileDown className="h-3.5 w-3.5 mr-1" />PDF</Button>
          </div>
        </div>

        <div className="space-y-3">
          {(historial as any[]).map((insc: any) => {
            const mats = insc.sem_inscripcion_materias || [];
            const aprob = mats.filter((m: any) => m.estado === "aprobada").length;
            const reprob = mats.filter((m: any) => m.estado === "reprobada").length;
            const retir = mats.filter((m: any) => m.estado === "cancelada" || m.estado === "retirada").length;
            const cursando = mats.filter((m: any) => m.estado === "cursando").length;
            const isCurrent = insc.id === currentInscripcionId;
            return (
              <div key={insc.id} className={`border rounded p-3 ${isCurrent ? "border-primary bg-primary/5" : ""}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{insc.sem_periodos?.nombre || insc.sem_periodos?.codigo || "—"}</Badge>
                    {isCurrent && <Badge className="text-[10px]">Periodo actual</Badge>}
                    <span className="text-[10px] text-muted-foreground">Promedio: {insc.promedio_acumulado ?? "—"}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {aprob > 0 && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">{aprob} aprob.</Badge>}
                    {reprob > 0 && <Badge className="text-[10px] bg-red-100 text-red-700 border-red-300">{reprob} reprob.</Badge>}
                    {retir > 0 && <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">{retir} retir.</Badge>}
                    {cursando > 0 && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-300">{cursando} cursando</Badge>}
                  </div>
                </div>
                {mats.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">Sin materias registradas</p>
                ) : (
                  <table className="w-full text-[11px]">
                    <thead className="text-muted-foreground">
                      <tr className="border-b">
                        <th className="text-left py-1">Materia</th>
                        <th className="text-center py-1 w-20">Estado</th>
                        <th className="text-right py-1 w-12">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mats.map((m: any) => (
                        <tr key={m.id} className="border-b last:border-0">
                          <td className="py-1">
                            <div className="font-medium">{m.sem_materias?.nombre || "—"}</div>
                            <div className="text-[10px] text-muted-foreground">{m.sem_materias?.codigo}</div>
                          </td>
                          <td className="py-1 text-center">
                            <span className={
                              m.estado === "aprobada" ? "text-emerald-600" :
                              m.estado === "reprobada" ? "text-red-600" :
                              m.estado === "cancelada" || m.estado === "retirada" ? "text-amber-600" :
                              "text-muted-foreground"
                            }>{m.estado}</span>
                          </td>
                          <td className="py-1 text-right font-mono">{m.nota_final ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
