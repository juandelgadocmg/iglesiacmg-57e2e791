import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { useProgMinisterios, useProgAsignaciones, useProgEventos, useProgCargos, getCargoTipo } from "@/hooks/usePrograma";
import { usePersonas } from "@/hooks/useDatabase";

export default function ReportesProgPanel() {
  const { data: ministerios = [] } = useProgMinisterios();
  const { data: asignaciones = [] } = useProgAsignaciones();
  const { data: eventos = [] } = useProgEventos();
  const { data: personas = [] } = usePersonas();
  const { data: cargos = [] } = useProgCargos();

  const personasMap = useMemo(() => new Map(personas.map((p: any) => [p.id, p])), [personas]);
  const eventosMap = useMemo(() => new Map(eventos.map((e) => [e.id, e])), [eventos]);
  const minMap = useMemo(() => new Map(ministerios.map((m) => [m.id, m])), [ministerios]);
  const cargosMap = useMemo(() => new Map(cargos.map((c) => [c.id, c])), [cargos]);

  const porPersona = useMemo(() => {
    const m = new Map<string, { total: number; presente: number; ausente: number; tarde: number; last: string | null; cargos: Set<string>; tipos: Set<string> }>();
    asignaciones.forEach((a) => {
      const cur = m.get(a.persona_id) || { total: 0, presente: 0, ausente: 0, tarde: 0, last: null, cargos: new Set<string>(), tipos: new Set<string>() };
      cur.total++;
      if (a.asistencia === "presente") cur.presente++;
      if (a.asistencia === "ausente") cur.ausente++;
      if (a.asistencia === "tarde") cur.tarde++;
      const c = a.cargo_id ? cargosMap.get(a.cargo_id) : null;
      if (c?.nombre) cur.cargos.add(c.nombre);
      const tipo = getCargoTipo(c?.nombre);
      if (tipo) cur.tipos.add(tipo);
      const ev = eventosMap.get(a.evento_id);
      if (ev && (!cur.last || ev.fecha > cur.last)) cur.last = ev.fecha;
      m.set(a.persona_id, cur);
    });
    return Array.from(m.entries())
      .map(([persona_id, v]) => {
        const p: any = personasMap.get(persona_id);
        return {
          persona_id,
          nombre: p ? `${p.nombres} ${p.apellidos}` : "—",
          total: v.total,
          presente: v.presente,
          ausente: v.ausente,
          tarde: v.tarde,
          last: v.last,
          cargos: Array.from(v.cargos).join(", ") || "—",
          tipo_cargo: Array.from(v.tipos).join(", ") || "—",
          pct: v.total ? Math.round((v.presente / v.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [asignaciones, personasMap, eventosMap, cargosMap]);

  const detalleAsignaciones = useMemo(() => {
    return asignaciones.map((a) => {
      const p: any = personasMap.get(a.persona_id);
      const c = a.cargo_id ? cargosMap.get(a.cargo_id) : null;
      const ev = eventosMap.get(a.evento_id);
      return {
        fecha: ev?.fecha || "—",
        evento: ev?.titulo || "—",
        ministerio: minMap.get(a.ministerio_id)?.nombre || "—",
        cargo: c?.nombre || "—",
        tipo_cargo: getCargoTipo(c?.nombre) || "—",
        servidor: p ? `${p.nombres} ${p.apellidos}` : "—",
        estado: a.estado,
        asistencia: a.asistencia || "—",
        telefono: p?.telefono || p?.whatsapp || "—",
      };
    }).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  }, [asignaciones, personasMap, cargosMap, eventosMap, minMap]);

  const porMinisterio = useMemo(() => {
    const m = new Map<string, { total: number; presente: number; tarde: number; ausente: number; confirmados: number }>();
    asignaciones.forEach((a) => {
      const cur = m.get(a.ministerio_id) || { total: 0, presente: 0, tarde: 0, ausente: 0, confirmados: 0 };
      cur.total++;
      if (a.asistencia === "presente") cur.presente++;
      if (a.asistencia === "tarde") cur.tarde++;
      if (a.asistencia === "ausente") cur.ausente++;
      if (a.estado === "confirmado") cur.confirmados++;
      m.set(a.ministerio_id, cur);
    });
    return Array.from(m.entries()).map(([id, v]) => ({ ministerio: minMap.get(id)?.nombre || "—", ...v })).sort((a, b) => b.total - a.total);
  }, [asignaciones, minMap]);

  const ausencias = porPersona.filter((p) => p.ausente > 0).sort((a, b) => b.ausente - a.ausente);
  const confirmaciones = porPersona.map((p) => ({ nombre: p.nombre, total: p.total, presente: p.presente, ausente: p.ausente, tarde: p.tarde })).filter((p) => p.total > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Ministerios — Resumen</CardTitle>
            <ExportDropdown
              title="Servicios por ministerio"
              filename="servicios-por-ministerio"
              columns={[
                { header: "Ministerio", key: "ministerio" },
                { header: "Total asignaciones", key: "total" },
                { header: "Confirmados", key: "confirmados" },
                { header: "Presente", key: "presente" },
                { header: "Tarde", key: "tarde" },
                { header: "Ausente", key: "ausente" },
              ]}
              data={porMinisterio}
            />
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {porMinisterio.map((r) => (
                <div key={r.ministerio} className="flex justify-between items-center text-sm">
                  <span>{r.ministerio}</span>
                  <div className="flex gap-1">
                    <Badge variant="secondary">{r.total}</Badge>
                    <Badge className="bg-green-100 text-green-700 border-0">{r.presente}✓</Badge>
                    <Badge className="bg-red-100 text-red-700 border-0">{r.ausente}✗</Badge>
                  </div>
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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Reporte de ausencias</CardTitle>
          <ExportDropdown
            title="Ausencias por servidor"
            filename="ausencias-por-servidor"
            columns={[
              { header: "Servidor", key: "nombre" },
              { header: "Ausencias", key: "ausente" },
              { header: "Tarde", key: "tarde" },
              { header: "Total asignaciones", key: "total" },
              { header: "% Asistencia", key: "pct" },
            ]}
            data={ausencias}
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 text-sm">
            {ausencias.length === 0 && <p className="text-muted-foreground">Sin ausencias registradas.</p>}
            {ausencias.map((r) => (
              <div key={r.persona_id} className="flex justify-between"><span>{r.nombre}</span><Badge variant="destructive">{r.ausente} ausencias</Badge></div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Confirmaciones y servicios realizados</CardTitle>
          <ExportDropdown
            title="Confirmaciones y servicios"
            filename="confirmaciones-servicios"
            columns={[
              { header: "Servidor", key: "nombre" },
              { header: "Total", key: "total" },
              { header: "Presente", key: "presente" },
              { header: "Tarde", key: "tarde" },
              { header: "Ausente", key: "ausente" },
            ]}
            data={confirmaciones}
          />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Exporta el detalle completo de confirmaciones y servicios realizados por persona en PDF o Excel.</p>
        </CardContent>
      </Card>
    </div>
  );
}
