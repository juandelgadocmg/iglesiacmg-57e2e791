import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import SearchableCombobox from "@/components/seminario/SearchableCombobox";
import type { IsoMinisterioTemplate } from "@/lib/isoMinisterioTemplates";
import { exportIsoMinisterioPdf, normKey } from "@/lib/exportIsoMinisterioPdf";
import {
  useProgEventos,
  useProgAsignaciones,
  useProgCargos,
  useUpsertAsignacion,
  useDeleteAsignacion,
  useUpsertCargo,
  type ProgMinisterio,
} from "@/hooks/usePrograma";
import { usePersonas } from "@/hooks/useDatabase";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ministerio: ProgMinisterio;
  template: IsoMinisterioTemplate;
  liderNombre: string;
}

export default function IsoProgramacionPreview({ open, onOpenChange, ministerio, template, liderNombre }: Props) {
  const { data: eventos = [] } = useProgEventos();
  const { data: asignaciones = [] } = useProgAsignaciones();
  const { data: cargos = [] } = useProgCargos();
  const { data: personas = [] } = usePersonas();
  const upAsig = useUpsertAsignacion();
  const delAsig = useDeleteAsignacion();
  const upCargo = useUpsertCargo();

  const [mes, setMes] = useState(() => new Date().toLocaleDateString("es-CO", { month: "long" }).toUpperCase());
  const [uniformeMap, setUniformeMap] = useState<Record<string, string>>({});
  const [observacionMap, setObservacionMap] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<{ eventoId: string; estacion: string } | null>(null);
  const [addValue, setAddValue] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const proxEventos = useMemo(
    () => eventos.filter((e) => e.fecha >= today).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [eventos, today]
  );

  const personasMap = useMemo(() => new Map(personas.map((p: any) => [p.id, p])), [personas]);

  // cargos del ministerio indexados por normKey
  const cargosMin = useMemo(() => cargos.filter((c) => c.ministerio_id === ministerio.id), [cargos, ministerio.id]);
  const cargoPorEstacion = useMemo(() => {
    const m = new Map<string, typeof cargosMin[number]>();
    cargosMin.forEach((c) => m.set(normKey(c.nombre), c));
    return m;
  }, [cargosMin]);

  // Asignaciones por evento -> estacion -> lista{ id, persona }
  type Cell = { id: string; persona_id: string; nombre: string };
  const cellsByEv = useMemo(() => {
    const m = new Map<string, Map<string, Cell[]>>();
    proxEventos.forEach((e) => m.set(e.id, new Map()));
    asignaciones
      .filter((a) => a.ministerio_id === ministerio.id)
      .forEach((a) => {
        const ev = m.get(a.evento_id);
        if (!ev) return;
        const c = a.cargo_id ? cargosMin.find((x) => x.id === a.cargo_id) : null;
        if (!c) return;
        const key = normKey(c.nombre);
        const p: any = personasMap.get(a.persona_id);
        if (!p) return;
        const arr = ev.get(key) || [];
        arr.push({ id: a.id, persona_id: a.persona_id, nombre: `${p.nombres} ${p.apellidos}` });
        ev.set(key, arr);
      });
    return m;
  }, [proxEventos, asignaciones, cargosMin, ministerio.id, personasMap]);

  const personaItems = useMemo(
    () =>
      personas.map((p: any) => ({
        id: p.id,
        label: `${p.nombres} ${p.apellidos}`,
        sub: p.telefono || p.whatsapp || "",
      })),
    [personas]
  );

  const ensureCargo = async (estacion: string) => {
    const k = normKey(estacion);
    const existing = cargoPorEstacion.get(k);
    if (existing) return existing.id;
    const created = await upCargo.mutateAsync({
      ministerio_id: ministerio.id,
      nombre: estacion,
      orden: template.estaciones.indexOf(estacion),
      cupo: 1,
    });
    return (created as any).id;
  };

  const addPersona = async (eventoId: string, estacion: string, persona_id: string) => {
    try {
      const cargo_id = await ensureCargo(estacion);
      await upAsig.mutateAsync({
        evento_id: eventoId,
        ministerio_id: ministerio.id,
        cargo_id,
        persona_id,
        estado: "asignado",
      });
      toast.success("Asignación guardada");
      setAdding(null);
      setAddValue("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removePersona = async (id: string) => {
    try {
      await delAsig.mutateAsync(id);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const descargar = () => {
    const asigsPorEv = new Map<string, Map<string, string>>();
    proxEventos.forEach((e) => {
      const inner = new Map<string, string>();
      const cells = cellsByEv.get(e.id) || new Map();
      cells.forEach((arr: Cell[], key: string) => {
        inner.set(key, arr.map((x) => x.nombre).join(", "));
      });
      asigsPorEv.set(e.id, inner);
    });
    exportIsoMinisterioPdf({
      template,
      mes,
      liderNombre,
      eventos: proxEventos.map((e) => ({ id: e.id, fecha: e.fecha, titulo: e.titulo, hora: e.hora })),
      asignacionesPorEvento: asigsPorEv,
      uniformePorEvento: new Map(Object.entries(uniformeMap)),
      observacionPorEvento: new Map(Object.entries(observacionMap)),
    });
    toast.success(`PDF ISO (${template.codigo}) generado`);
  };

  const formatFecha = (iso: string) => {
    try {
      const d = new Date(iso + "T12:00:00");
      return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } catch {
      return iso;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[98vw] max-h-[95vh] overflow-hidden flex flex-col p-0">
        {/* ===== Encabezado ISO ===== */}
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle className="text-base">Vista previa: {template.titulo}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-4 py-3 space-y-3 bg-muted/30">
          {/* Caja header tipo ISO */}
          <div className="bg-white border border-black grid grid-cols-[120px_1fr_180px] text-[11px]">
            <div className="border-r border-black flex flex-col items-center justify-center py-2">
              <div className="font-bold text-sm">CMG</div>
              <div className="text-[8px] text-center leading-tight">CENTRO MUNDIAL<br/>DE GLORIA</div>
            </div>
            <div className="border-r border-black flex items-center justify-center font-bold text-center px-2 text-[13px]">
              {template.titulo}
            </div>
            <div className="grid grid-rows-3 text-[10px]">
              <div className="grid grid-cols-[60px_1fr] border-b border-black">
                <div className="font-bold px-1 border-r border-black flex items-center">Código:</div>
                <div className="px-1 flex items-center">{template.codigo}</div>
              </div>
              <div className="grid grid-cols-[60px_1fr] border-b border-black">
                <div className="font-bold px-1 border-r border-black flex items-center">Versión:</div>
                <div className="px-1 flex items-center">{template.version}</div>
              </div>
              <div className="grid grid-cols-[60px_1fr]">
                <div className="font-bold px-1 border-r border-black flex items-center">Fecha:</div>
                <div className="px-1 flex items-center">{template.fechaVigencia}</div>
              </div>
            </div>
          </div>

          {/* Mes / Ministerio / Líder */}
          <div className="bg-white border border-black p-2 text-[12px] flex flex-wrap gap-x-6 gap-y-1 items-center">
            <div className="flex items-center gap-2">
              <span className="font-bold">MES:</span>
              <Input
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="h-7 w-32 text-[12px]"
              />
            </div>
            <div><span className="font-bold">MINISTERIO:</span> {template.nombreMinisterio}</div>
            <div><span className="font-bold">LÍDER:</span> {liderNombre || "—"}</div>
          </div>

          {/* Tabla */}
          <div className="bg-white border border-black overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border border-black px-2 py-1 text-left w-40">FECHA</th>
                  {template.estaciones.map((est) => (
                    <th key={est} className="border border-black px-2 py-1 text-center min-w-[130px]">
                      {est.toUpperCase()}
                    </th>
                  ))}
                  <th className="border border-black px-2 py-1 text-center min-w-[120px]">UNIFORME</th>
                  <th className="border border-black px-2 py-1 text-center min-w-[140px]">OBSERVACIÓN</th>
                </tr>
              </thead>
              <tbody>
                {proxEventos.length === 0 && (
                  <tr><td colSpan={template.estaciones.length + 3} className="text-center text-muted-foreground py-4 border border-black">Sin eventos programados</td></tr>
                )}
                {proxEventos.map((e) => {
                  const cells = cellsByEv.get(e.id) || new Map();
                  return (
                    <tr key={e.id} className="align-top">
                      <td className="border border-black px-2 py-1 whitespace-nowrap">
                        {formatFecha(e.fecha)}
                        {e.hora && <div className="text-[10px] text-muted-foreground">{e.hora}</div>}
                      </td>
                      {template.estaciones.map((est) => {
                        const key = normKey(est);
                        const arr: Cell[] = cells.get(key) || [];
                        const isAdding = adding?.eventoId === e.id && adding?.estacion === est;
                        return (
                          <td key={est} className="border border-black px-1.5 py-1">
                            <div className="flex flex-col gap-1">
                              {arr.map((c) => (
                                <Badge key={c.id} variant="secondary" className="justify-between gap-1 font-normal text-[10px] py-0.5">
                                  <span className="truncate">{c.nombre}</span>
                                  <button onClick={() => removePersona(c.id)} className="hover:text-destructive">
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                              {isAdding ? (
                                <div className="flex flex-col gap-1">
                                  <SearchableCombobox
                                    items={personaItems}
                                    value={addValue}
                                    onChange={(id) => { if (id) addPersona(e.id, est, id); }}
                                    placeholder="Buscar persona…"
                                    width="w-full"
                                  />
                                  <Button size="sm" variant="ghost" className="h-5 text-[10px]" onClick={() => { setAdding(null); setAddValue(""); }}>Cancelar</Button>
                                </div>
                              ) : (
                                <button
                                  className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
                                  onClick={() => { setAdding({ eventoId: e.id, estacion: est }); setAddValue(""); }}
                                >
                                  <Plus className="h-3 w-3" /> Agregar
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="border border-black p-1">
                        <Input
                          value={uniformeMap[e.id] || ""}
                          onChange={(ev) => setUniformeMap({ ...uniformeMap, [e.id]: ev.target.value })}
                          className="h-7 text-[11px]"
                          placeholder="Uniforme…"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <Input
                          value={observacionMap[e.id] || ""}
                          onChange={(ev) => setObservacionMap({ ...observacionMap, [e.id]: ev.target.value })}
                          className="h-7 text-[11px]"
                          placeholder="Observación…"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Importante */}
          {template.importante && (
            <div className="bg-white border border-black p-2 text-[10px]">
              <span className="font-bold">Importante: </span>{template.importante}
            </div>
          )}
          <div className="bg-white border border-black p-2 text-[10px]">
            <span className="font-bold">Responsabilidades: </span>{template.responsabilidades}
          </div>

          {/* Firmas */}
          <div className="grid grid-cols-4 bg-white border border-black text-[10px]">
            {["", "Elaborado por:", "Revisado por:", "Autorizado por:"].map((t, i) => (
              <div key={i} className={`p-1 font-bold ${i < 3 ? "border-r border-black" : ""} border-b border-black`}>{t}</div>
            ))}
            {["Firma", "", "", ""].map((t, i) => (
              <div key={i} className={`p-1 h-8 ${i < 3 ? "border-r border-black" : ""} border-b border-black`}>{t}</div>
            ))}
            {["Nombre", template.firmas.elaboradoPor.nombre, template.firmas.revisadoPor.nombre, template.firmas.autorizadoPor.nombre].map((t, i) => (
              <div key={i} className={`p-1 ${i < 3 ? "border-r border-black" : ""} border-b border-black`}>{t}</div>
            ))}
            {["Cargo", template.firmas.elaboradoPor.cargo, template.firmas.revisadoPor.cargo, template.firmas.autorizadoPor.cargo].map((t, i) => (
              <div key={i} className={`p-1 ${i < 3 ? "border-r border-black" : ""}`}>{t}</div>
            ))}
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={descargar}><FileDown className="h-4 w-4 mr-1" />Descargar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
