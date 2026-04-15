import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePersonas } from "@/hooks/useDatabase";
import { useEscuelas, useAllPeriodos, useAllMatriculas, useMaterias, useCortes } from "@/hooks/useAcademia";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, User, BookOpen, FileText } from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "@/lib/utils";

function useStudentGradeHistory(personaId: string | null, escuelaId: string | null) {
  return useQuery({
    queryKey: ["student-grade-history", personaId, escuelaId],
    enabled: !!personaId,
    queryFn: async () => {
      let q = supabase
        .from("matriculas")
        .select("*, materias(nombre, periodo_id, horario), cursos(nombre), periodos_academicos(nombre, fecha_inicio, fecha_fin)")
        .eq("persona_id", personaId!);
      if (escuelaId) q = q.eq("curso_id", escuelaId);
      const { data: matriculas, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      if (!matriculas?.length) return { matriculas: [], calificaciones: [], asistencias: [] };

      const matIds = matriculas.map((m: any) => m.id);

      // Get all calificaciones for these matriculas
      const { data: calificaciones } = await supabase
        .from("calificaciones")
        .select("*, items_calificables(nombre, tipo, porcentaje, corte_id, cortes_academicos(nombre, numero))")
        .in("matricula_id", matIds);

      // Get attendance counts
      const { data: asistencias } = await supabase
        .from("asistencia_materias")
        .select("*")
        .in("matricula_id", matIds);

      return { matriculas, calificaciones: calificaciones || [], asistencias: asistencias || [] };
    },
  });
}

export default function HistorialCalificacionesSection() {
  const { data: personas } = usePersonas();
  const { data: escuelas } = useEscuelas();
  const [search, setSearch] = useState("");
  const [selectedEscuela, setSelectedEscuela] = useState<string>("");
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  const { data: historyData, isLoading } = useStudentGradeHistory(selectedPersona, selectedEscuela || null);

  const filteredPersonas = useMemo(() => {
    if (!personas || !search) return [];
    const q = search.toLowerCase();
    return personas.filter((p: any) =>
      `${p.nombres} ${p.apellidos} ${p.documento || ""}`.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [personas, search]);

  const selectedPersonaObj = useMemo(() => {
    if (!selectedPersona || !personas) return null;
    return personas.find((p: any) => p.id === selectedPersona);
  }, [selectedPersona, personas]);

  // Build grade summary per materia
  const materiasSummary = useMemo(() => {
    if (!historyData?.matriculas?.length) return [];
    return historyData.matriculas.map((m: any) => {
      const materiaName = m.materias?.nombre || m.cursos?.nombre || "—";
      const periodo = m.periodos_academicos?.nombre || "";

      // Get calificaciones for this matricula
      const cals = historyData.calificaciones.filter((c: any) => c.matricula_id === m.id);

      // Group by corte
      const corteMap = new Map<string, { nombre: string; notas: number[] }>();
      cals.forEach((c: any) => {
        const corteName = c.items_calificables?.cortes_academicos?.nombre || "Corte";
        const corteId = c.items_calificables?.corte_id || "default";
        if (!corteMap.has(corteId)) corteMap.set(corteId, { nombre: corteName, notas: [] });
        if (c.nota != null) corteMap.get(corteId)!.notas.push(c.nota);
      });

      const cortes = Array.from(corteMap.entries()).map(([id, data]) => ({
        id,
        nombre: data.nombre,
        promedio: data.notas.length ? (data.notas.reduce((s, v) => s + v, 0) / data.notas.length) : null,
      }));

      // Attendance
      const att = historyData.asistencias.filter((a: any) => a.matricula_id === m.id);
      const totalAtt = att.length;
      const presentAtt = att.filter((a: any) => a.presente).length;

      // Final grade
      const allNotas = cals.filter((c: any) => c.nota != null).map((c: any) => c.nota as number);
      const notaFinal = m.nota_final ?? (allNotas.length ? (allNotas.reduce((s, v) => s + v, 0) / allNotas.length) : null);

      return {
        id: m.id,
        materia: materiaName,
        periodo,
        horario: m.materias?.horario || "",
        estado: m.estado,
        cortes,
        asistencia: totalAtt > 0 ? `${presentAtt} DE ${totalAtt}` : "—",
        notaFinal: notaFinal != null ? Number(notaFinal).toFixed(1) : "—",
        notaFinalNum: notaFinal,
        aprobo: m.estado === "Aprobó" || (notaFinal != null && notaFinal >= 3),
      };
    });
  }, [historyData]);

  const exportPDF = () => {
    if (!selectedPersonaObj || !materiasSummary.length) return;
    const doc = new jsPDF();
    const name = `${selectedPersonaObj.nombres} ${selectedPersonaObj.apellidos}`;

    doc.setFontSize(16);
    doc.text("HISTORIAL DE CALIFICACIONES", 14, 20);
    doc.setFontSize(11);
    doc.text(`Estudiante: ${name}`, 14, 30);
    if (selectedPersonaObj.documento) doc.text(`Identificación: ${selectedPersonaObj.documento}`, 14, 36);

    const escuelaNombre = escuelas?.find((e: any) => e.id === selectedEscuela)?.nombre || "Todas las escuelas";
    doc.text(`Escuela: ${escuelaNombre}`, 14, 42);

    const headers = ["MATERIA"];
    const maxCortes = Math.max(...materiasSummary.map(m => m.cortes.length), 1);
    for (let i = 1; i <= maxCortes; i++) headers.push(`CORTE #${i}`);
    headers.push("ASISTENCIAS", "CALIFICACIÓN FINAL");

    const body = materiasSummary.map(m => {
      const row = [m.materia.toUpperCase()];
      for (let i = 0; i < maxCortes; i++) {
        row.push(m.cortes[i]?.promedio != null ? m.cortes[i].promedio!.toFixed(1) : "—");
      }
      row.push(m.asistencia, m.notaFinal);
      return row;
    });

    autoTable(doc, {
      head: [headers],
      body,
      startY: 50,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save(`historial_calificaciones_${name.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Aquí encontrarás el historial de calificaciones del estudiante.</p>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedEscuela} onValueChange={setSelectedEscuela}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Filtro por escuelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las escuelas</SelectItem>
            {(escuelas || []).map((e: any) => (
              <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar asistente por código, nombre o cédula..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (!e.target.value) setSelectedPersona(null); }}
            className="pl-10"
          />
          {filteredPersonas.length > 0 && search && !selectedPersona && (
            <div className="absolute z-10 w-full mt-1 rounded-xl border bg-popover shadow-lg max-h-60 overflow-auto">
              {filteredPersonas.map((p: any) => {
                const initials = `${p.nombres?.[0] || ""}${p.apellidos?.[0] || ""}`.toUpperCase();
                return (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPersona(p.id); setSearch(`${p.nombres} ${p.apellidos}`); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={p.foto_url || undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{p.nombres} {p.apellidos}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.documento && `ID: ${p.documento}`}
                        {p.tipo_persona && ` · ${p.tipo_persona}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected student card */}
      {selectedPersonaObj && (
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={selectedPersonaObj.foto_url || undefined} />
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {`${selectedPersonaObj.nombres?.[0] || ""}${selectedPersonaObj.apellidos?.[0] || ""}`.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">{selectedPersonaObj.nombres} {selectedPersonaObj.apellidos}</h3>
            <div className="flex gap-3 text-xs text-muted-foreground">
              {selectedPersonaObj.documento && <span>ID: {selectedPersonaObj.documento}</span>}
              {selectedPersonaObj.telefono && <span>Tel: {selectedPersonaObj.telefono}</span>}
              <Badge variant="outline" className="text-[10px]">{selectedPersonaObj.tipo_persona}</Badge>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => { setSelectedPersona(null); setSearch(""); }}>✕</Button>
        </div>
      )}

      {/* Grade history table */}
      {isLoading && <Skeleton className="h-48" />}

      {selectedPersona && !isLoading && (
        <>
          {selectedEscuela && selectedEscuela !== "all" && (
            <h3 className="text-base font-bold uppercase text-foreground">
              {escuelas?.find((e: any) => e.id === selectedEscuela)?.nombre || ""}
            </h3>
          )}

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={exportPDF} disabled={!materiasSummary.length} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Exportar PDF
            </Button>
          </div>

          {materiasSummary.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay matrículas registradas para este estudiante.</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">MATERIA</th>
                      {Array.from({ length: Math.max(...materiasSummary.map(m => m.cortes.length), 1) }, (_, i) => (
                        <th key={i} className="text-center p-3 font-medium text-muted-foreground">CORTE #{i + 1}</th>
                      ))}
                      <th className="text-center p-3 font-medium text-muted-foreground">ASISTENCIAS</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">CALIFICACIÓN FINAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiasSummary.map((m) => {
                      const maxCortes = Math.max(...materiasSummary.map(s => s.cortes.length), 1);
                      return (
                        <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 font-medium uppercase">{m.materia}</td>
                          {Array.from({ length: maxCortes }, (_, i) => (
                            <td key={i} className="p-3 text-center">
                              {m.cortes[i]?.promedio != null ? (
                                <Badge className={cn("text-xs",
                                  m.cortes[i].promedio! >= 3 ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                                )}>
                                  {m.cortes[i].promedio!.toFixed(1)}
                                </Badge>
                              ) : "—"}
                            </td>
                          ))}
                          <td className="p-3 text-center">
                            {m.asistencia !== "—" ? (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary">{m.asistencia}</Badge>
                            ) : "—"}
                          </td>
                          <td className="p-3 text-center">
                            {m.notaFinal !== "—" ? (
                              <Badge className={cn("text-xs",
                                m.aprobo ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                              )}>
                                {m.notaFinal}
                              </Badge>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!selectedPersona && !isLoading && (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Selecciona un estudiante para ver su historial de calificaciones.</p>
        </div>
      )}
    </div>
  );
}
