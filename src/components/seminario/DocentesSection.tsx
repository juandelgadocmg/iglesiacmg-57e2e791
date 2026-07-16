import { useState, useMemo } from "react";
import { useDocentes, usePeriodos, useProgramas } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { User, BookOpen, Search, Users } from "lucide-react";
import { matchesPersona } from "@/lib/seminarioSearch";
import SectionHero from "@/components/shell/SectionHero";

export default function DocentesSection() {
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || programas?.[0]?.id || "";
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useState("");
  const { data: docentes = [] } = useDocentes(periodoId || undefined);
  const [q, setQ] = useState("");

  // Al cambiar de programa, resetea el periodo y la búsqueda para evitar estado inconsistente
  const handleProgramaChange = (v: string) => {
    setProgramaId(v);
    setPeriodoId("");
  };

  const filtered = useMemo(() => {
    if (!q.trim()) return docentes as any[];
    return (docentes as any[]).filter((d) => matchesPersona(q, { nombre: d.nombre, documento: d.documento }));
  }, [docentes, q]);

  const periodoLabel = (periodos || []).find((p: any) => p.id === periodoId)?.nombre;

  return (
    <div className="space-y-4">
      <SectionHero
        icon={Users}
        eyebrow="Cuerpo académico"
        title="Docentes del Seminario"
        description="Lista de docentes con materias asignadas y métricas por periodo."
        gradient="from-emerald-600 via-teal-600 to-cyan-600"
        stats={[
          { label: "Docentes", value: (docentes as any[]).length, tone: "info" },
          { label: "Filtrados", value: filtered.length, tone: "ok" },
          { label: "Periodo", value: periodoLabel || "Todos" },
          { label: "Programa", value: (programas || []).find((p: any) => p.id === effProg)?.codigo || "—" },
        ]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o CC…" className="pl-8 w-52" />
            </div>
            <Select value={effProg} onValueChange={handleProgramaChange}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Programa" /></SelectTrigger>
              <SelectContent>{(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={periodoId || "_all"} onValueChange={(v) => setPeriodoId(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Periodo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos los periodos</SelectItem>
                {(periodos || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          {q.trim()
            ? `Ningún docente coincide con "${q}"${periodoLabel ? ` en el periodo ${periodoLabel}` : ""}.`
            : (periodoLabel ? `Sin docentes asignados en el periodo ${periodoLabel}.` : "Sin docentes asignados aún.")}
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d: any) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{d.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.documento ? `CC ${d.documento}` : (d.persona_id ? "Persona vinculada" : "Solo nombre")}</p>
                  </div>
                  <Badge variant="secondary">{d.materias} materias</Badge>
                </div>
                <div className="border-t pt-2 space-y-1">
                  {d.ofertas.slice(0, 4).map((o: any) => (
                    <div key={o.id} className="flex items-center gap-1.5 text-xs">
                      <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{o.sem_materias?.nombre || "Materia"}</span>
                      <span className="text-muted-foreground ml-auto">{o.sem_materias?.codigo}</span>
                    </div>
                  ))}
                  {d.ofertas.length > 4 && (
                    <p className="text-[10px] text-muted-foreground">+{d.ofertas.length - 4} más</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
