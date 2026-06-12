import { useState, useMemo } from "react";
import { useReportesAcademicos, useProgramas, usePeriodos } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Download, TrendingUp, BookOpen, FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { toast } from "sonner";

export default function ReportesSection() {
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || (programas as any[])?.[0]?.id || "";
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useState("");
  const { data: registros = [], isLoading: loadingRep } = useReportesAcademicos(effProg || undefined, periodoId || undefined);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const byMateria = useMemo(() => {
    const map: Record<string, { nombre: string; codigo: string; total: number; aprobadas: number; reprobadas: number; promedio: number; sumaNotas: number; countNotas: number }> = {};
    (registros as any[]).forEach((r) => {
      const m = r.sem_materias;
      if (!m) return;
      if (!map[m.id]) map[m.id] = { nombre: m.nombre, codigo: m.codigo, total: 0, aprobadas: 0, reprobadas: 0, promedio: 0, sumaNotas: 0, countNotas: 0 };
      const x = map[m.id];
      x.total++;
      if (r.estado === "aprobada") x.aprobadas++;
      if (r.estado === "reprobada") x.reprobadas++;
      if (r.nota_final != null) { x.sumaNotas += Number(r.nota_final); x.countNotas++; }
    });
    return Object.values(map).map(x => ({ ...x, promedio: x.countNotas ? x.sumaNotas / x.countNotas : 0, tasaApr: x.total ? Math.round((x.aprobadas / x.total) * 100) : 0 }));
  }, [registros]);

  const promedioGeneral = useMemo(() => {
    const notas = (registros as any[]).filter(r => r.nota_final != null).map(r => Number(r.nota_final));
    if (!notas.length) return 0;
    return notas.reduce((a, b) => a + b, 0) / notas.length;
  }, [registros]);

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return byMateria;
    return byMateria.filter(m => m.nombre.toLowerCase().includes(term) || m.codigo.toLowerCase().includes(term));
  }, [byMateria, q]);
  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtradas.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportar = () => {
    if (!filtradas.length) { toast.error("No hay datos para exportar"); return; }
    exportToExcel({
      title: "Reporte Académico Seminario",
      filename: "reporte-academico-seminario",
      columns: [
        { header: "Código", key: "codigo" },
        { header: "Materia", key: "nombre" },
        { header: "Inscritos", key: "total" },
        { header: "Aprobadas", key: "aprobadas" },
        { header: "Reprobadas", key: "reprobadas" },
        { header: "% Aprobación", key: "tasaApr" },
        { header: "Promedio", key: "promedio" },
      ],
      data: filtradas.map(r => ({ ...r, promedio: r.promedio.toFixed(2) })),
    });
    toast.success(`Exportadas ${filtradas.length} materias a Excel`);
  };

  const exportarPdf = () => {
    if (!filtradas.length) { toast.error("No hay datos para exportar"); return; }
    exportToPDF({
      title: "Reporte Académico Seminario",
      filename: "reporte-academico-seminario",
      columns: [
        { header: "Código", key: "codigo" },
        { header: "Materia", key: "nombre" },
        { header: "Inscritos", key: "total" },
        { header: "Aprob.", key: "aprobadas" },
        { header: "Reprob.", key: "reprobadas" },
        { header: "% Aprob.", key: "tasaApr" },
        { header: "Promedio", key: "promedio" },
      ],
      data: filtradas.map(r => ({ ...r, promedio: r.promedio.toFixed(2) })),
    });
    toast.success("PDF generado");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Reportes</h2>
          <p className="text-xs text-muted-foreground">Indicadores académicos por programa y periodo</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={effProg} onValueChange={setProgramaId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>{(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={periodoId || "_all"} onValueChange={(v) => setPeriodoId(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {(periodos || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={exportar} disabled={!filtradas.length}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <Button size="sm" variant="outline" onClick={exportarPdf} disabled={!filtradas.length}><FileText className="h-4 w-4 mr-1" />PDF</Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Buscar materia por código o nombre…" className="pl-8 h-9" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Registros</p><p className="text-2xl font-bold">{registros.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Promedio</p><p className="text-2xl font-bold">{promedioGeneral.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Materias activas</p><p className="text-2xl font-bold">{byMateria.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">% Aprobación gral</p><p className="text-2xl font-bold">{byMateria.length ? Math.round(byMateria.reduce((a, b) => a + b.tasaApr, 0) / byMateria.length) : 0}%</p></CardContent></Card>
      </div>

      <Tabs defaultValue="aprobacion">
        <TabsList>
          <TabsTrigger value="aprobacion"><TrendingUp className="h-3.5 w-3.5 mr-1" />Aprobación por materia</TabsTrigger>
          <TabsTrigger value="reprobacion">Top reprobación</TabsTrigger>
          <TabsTrigger value="detalle"><BookOpen className="h-3.5 w-3.5 mr-1" />Detalle</TabsTrigger>
        </TabsList>

        <TabsContent value="aprobacion">
          <Card><CardContent className="p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMateria.slice(0, 15)}>
                <XAxis dataKey="codigo" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="tasaApr" name="% Aprobación">
                  {byMateria.slice(0, 15).map((d, i) => <Cell key={i} fill={d.tasaApr >= 70 ? "#16a34a" : d.tasaApr >= 50 ? "#eab308" : "#dc2626"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="reprobacion">
          <Card><CardContent className="p-0">
            <div className="divide-y">
              {[...byMateria].sort((a, b) => b.reprobadas - a.reprobadas).slice(0, 10).map((m, i) => (
                <div key={i} className="p-3 flex items-center gap-3">
                  <Badge variant="destructive">{m.reprobadas}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">{m.codigo} · {m.tasaApr}% aprob.</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="detalle">
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-2">Materia</th>
                  <th className="text-center p-2">Inscritos</th>
                  <th className="text-center p-2">Aprobadas</th>
                  <th className="text-center p-2">Reprobadas</th>
                  <th className="text-center p-2">% Aprob</th>
                  <th className="text-center p-2">Promedio</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={i} className="border-b hover:bg-muted/20">
                    <td className="p-2"><div className="font-medium">{m.nombre}</div><div className="text-[10px] text-muted-foreground">{m.codigo}</div></td>
                    <td className="p-2 text-center">{m.total}</td>
                    <td className="p-2 text-center text-emerald-600">{m.aprobadas}</td>
                    <td className="p-2 text-center text-destructive">{m.reprobadas}</td>
                    <td className="p-2 text-center">{m.tasaApr}%</td>
                    <td className="p-2 text-center">{m.promedio.toFixed(2)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <span className="text-xs">Página {safePage} de {totalPages} ({filtradas.length} materias)</span>
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
