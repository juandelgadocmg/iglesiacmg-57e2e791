import { useState } from "react";
import { useDocentes, usePeriodos, useProgramas } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { User, BookOpen, Search } from "lucide-react";

export default function DocentesSection() {
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || programas?.[0]?.id || "";
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useState("");
  const { data: docentes = [] } = useDocentes(periodoId || undefined);
  const [q, setQ] = useState("");

  // Al cambiar de programa, resetea el periodo para evitar mostrar uno que no pertenece
  const handleProgramaChange = (v: string) => {
    setProgramaId(v);
    setPeriodoId("");
  };

  const norm = (s: any) =>
    String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const filtered = (docentes as any[]).filter((d) => {
    const nq = norm(q);
    if (!nq) return true;
    return norm(d.nombre).includes(nq) || norm(d.documento).includes(nq);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Docentes del Seminario</h2>
          <p className="text-xs text-muted-foreground">Lista de docentes con materias y métricas</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o CC..." className="pl-8 w-56" />
          </div>
          <Select value={effProg} onValueChange={handleProgramaChange}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>{(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={periodoId || "_all"} onValueChange={(v) => setPeriodoId(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos los periodos</SelectItem>
              {(periodos || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sin docentes asignados aún.</CardContent></Card>
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
                    <p className="text-xs text-muted-foreground">{d.persona_id ? "Persona vinculada" : "Solo nombre"}</p>
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
