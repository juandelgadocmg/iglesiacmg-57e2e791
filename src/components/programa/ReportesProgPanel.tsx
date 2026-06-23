import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { useProgMinisterios, useProgAsignaciones, useProgEventos } from "@/hooks/usePrograma";
import { usePersonas } from "@/hooks/useDatabase";

export default function ReportesProgPanel() {
  const { data: ministerios = [] } = useProgMinisterios();
  const { data: asignaciones = [] } = useProgAsignaciones();
  const { data: eventos = [] } = useProgEventos();
  const { data: personas = [] } = usePersonas();

  const personasMap = useMemo(() => new Map(personas.map((p: any) => [p.id, p])), [personas]);
  const eventosMap = useMemo(() => new Map(eventos.map((e) => [e.id, e])), [eventos]);
  const minMap = useMemo(() => new Map(ministerios.map((m) => [m.id, m])), [ministerios]);

  const porPersona = useMemo(() => {
    const m = new Map<string, { total: number; presente: number; ausente: number; tarde: number; last: string | null }>();
    asignaciones.forEach((a) => {
      const cur = m.get(a.persona_id) || { total: 0, presente: 0, ausente: 0, tarde: 0, last: null };
      cur.total++;
      if (a.asistencia === "presente") cur.presente++;
      if (a.asistencia === "ausente") cur.ausente++;
      if (a.asistencia === "tarde") cur.tarde++;
      const ev = eventosMap.get(a.evento_id);
      if (ev && (!cur.last || ev.fecha > cur.last)) cur.last = ev.fecha;
      m.set(a.persona_id, cur);
    });
    return Array.from(m.entries())
      .map(([persona_id, v]) => {
        const p: any = personasMap.get(persona_id);
        return { persona_id, nombre: p ? `${p.nombres} ${p.apellidos}` : "—", ...v, pct: v.total ? Math.round((v.presente / v.total) * 100) : 0 };
      })
      .sort((a, b) => b.total - a.total);
  }, [asignaciones, personasMap, eventosMap]);

  const porMinisterio = useMemo(() => {
    const m = new Map<string, number>();
    asignaciones.forEach((a) => m.set(a.ministerio_id, (m.get(a.ministerio_id) || 0) + 1));
    return Array.from(m.entries()).map(([id, total]) => ({ ministerio: minMap.get(id)?.nombre || "—", total })).sort((a, b) => b.total - a.total);
  }, [asignaciones, minMap]);

  const ausencias = porPersona.filter((p) => p.ausente > 0).sort((a, b) => b.ausente - a.ausente);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Ministerios más activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {porMinisterio.map((r) => (
                <div key={r.ministerio} className="flex justify-between items-center text-sm">
                  <span>{r.ministerio}</span><Badge variant="secondary">{r.total}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Top servidores frecuentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {porPersona.slice(0, 10).map((r) => (
                <div key={r.persona_id} className="flex justify-between items-center text-sm">
                  <span className="truncate">{r.nombre}</span><Badge variant="secondary">{r.total} servicios</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Historial completo por servidor</CardTitle>
          <ExportDropdown
            title="Servicios por servidor"
            filename="servicios-por-servidor"
            columns={[
              { header: "Servidor", key: "nombre" },
              { header: "Total servicios", key: "total" },
              { header: "Presente", key: "presente" },
              { header: "Tarde", key: "tarde" },
              { header: "Ausente", key: "ausente" },
              { header: "% Asistencia", key: "pct" },
              { header: "Último", key: "last" },
            ]}
            data={porPersona}
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[420px] text-sm">
            <table className="w-full">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="text-left p-2">Servidor</th><th className="text-right p-2">Total</th><th className="text-right p-2">Presente</th><th className="text-right p-2">Tarde</th><th className="text-right p-2">Ausente</th><th className="text-right p-2">%</th><th className="text-right p-2">Último</th></tr>
              </thead>
              <tbody>
                {porPersona.map((r) => (
                  <tr key={r.persona_id} className="border-b">
                    <td className="p-2">{r.nombre}</td>
                    <td className="text-right p-2">{r.total}</td>
                    <td className="text-right p-2 text-green-600">{r.presente}</td>
                    <td className="text-right p-2 text-amber-600">{r.tarde}</td>
                    <td className="text-right p-2 text-destructive">{r.ausente}</td>
                    <td className="text-right p-2">{r.pct}%</td>
                    <td className="text-right p-2">{r.last || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Reporte de ausencias</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1.5 text-sm">
            {ausencias.length === 0 && <p className="text-muted-foreground">Sin ausencias registradas.</p>}
            {ausencias.map((r) => (
              <div key={r.persona_id} className="flex justify-between"><span>{r.nombre}</span><Badge variant="destructive">{r.ausente} ausencias</Badge></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
