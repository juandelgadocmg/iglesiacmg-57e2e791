import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Users, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useProgMinisterios, useProgCargos, useUpsertMinisterio, useDeleteMinisterio, useUpsertCargo, useDeleteCargo, useProgEventos, useProgAsignaciones, getCargoTipo, type ProgMinisterio, type ProgCargo } from "@/hooks/usePrograma";
import { usePersonas } from "@/hooks/useDatabase";
import { exportMinisterioProgramaPDF } from "@/lib/exportUtils";
import { findIsoTemplate } from "@/lib/isoMinisterioTemplates";
import { exportIsoMinisterioPdf, normKey } from "@/lib/exportIsoMinisterioPdf";
import { FileText, Eye } from "lucide-react";
import IsoProgramacionPreview from "./IsoProgramacionPreview";

export default function MinisteriosPanel() {
  const { data: ministerios = [] } = useProgMinisterios();
  const { data: cargos = [] } = useProgCargos();
  const { data: eventos = [] } = useProgEventos();
  const { data: asignaciones = [] } = useProgAsignaciones();
  const { data: personas = [] } = usePersonas();
  const upMin = useUpsertMinisterio();
  const delMin = useDeleteMinisterio();
  const upCar = useUpsertCargo();
  const delCar = useDeleteCargo();

  const [openMin, setOpenMin] = useState(false);
  const [editMin, setEditMin] = useState<Partial<ProgMinisterio>>({});
  const [openCar, setOpenCar] = useState<string | null>(null);
  const [editCar, setEditCar] = useState<Partial<ProgCargo>>({});

  const personasMap = useMemo(() => new Map(personas.map((p: any) => [p.id, p])), [personas]);
  const cargosMap = useMemo(() => new Map(cargos.map((c) => [c.id, c])), [cargos]);

  const saveMin = async () => {
    if (!editMin.nombre) return toast.error("Nombre requerido");
    try { await upMin.mutateAsync(editMin); toast.success("Ministerio guardado"); setOpenMin(false); setEditMin({}); } catch (e: any) { toast.error(e.message); }
  };
  const saveCar = async () => {
    if (!editCar.nombre || !editCar.ministerio_id) return;
    try { await upCar.mutateAsync({ ...editCar, cupo: editCar.cupo || 1 }); toast.success("Cargo guardado"); setEditCar({ ministerio_id: editCar.ministerio_id }); } catch (e: any) { toast.error(e.message); }
  };

  const descargarPdfMinisterio = (m: ProgMinisterio) => {
    const today = new Date().toISOString().slice(0, 10);
    const proxEventos = eventos
      .filter((e) => e.fecha >= today)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .filter((e) => asignaciones.some((a) => a.evento_id === e.id && a.ministerio_id === m.id));

    const tpl = findIsoTemplate(m.nombre);
    if (tpl) {
      // === PDF en formato ISO ===
      const asigsPorEv = new Map<string, Map<string, string>>();
      proxEventos.forEach((e) => {
        const inner = new Map<string, string>();
        asignaciones
          .filter((a) => a.evento_id === e.id && a.ministerio_id === m.id)
          .forEach((a) => {
            const p: any = personasMap.get(a.persona_id);
            const c = a.cargo_id ? cargosMap.get(a.cargo_id) : null;
            if (!p || !c) return;
            const key = normKey(c.nombre);
            const nombre = `${p.nombres} ${p.apellidos}`;
            inner.set(key, inner.has(key) ? `${inner.get(key)}, ${nombre}` : nombre);
          });
        asigsPorEv.set(e.id, inner);
      });
      const mesActual = new Date().toLocaleDateString("es-CO", { month: "long" });
      const lider = personasMap.get(m.lider_persona_id || "");
      exportIsoMinisterioPdf({
        template: tpl,
        mes: mesActual,
        liderNombre: lider ? `${(lider as any).nombres} ${(lider as any).apellidos}` : "",
        eventos: proxEventos.map((e) => ({ id: e.id, fecha: e.fecha, titulo: e.titulo, hora: e.hora })),
        asignacionesPorEvento: asigsPorEv,
      });
      toast.success(`PDF ISO (${tpl.codigo}) generado para ${m.nombre}`);
      return;
    }

    // === Fallback: PDF genérico ===
    const map = new Map<string, any[]>();
    proxEventos.forEach((e) => {
      const filas = asignaciones
        .filter((a) => a.evento_id === e.id && a.ministerio_id === m.id)
        .map((a) => {
          const p: any = personasMap.get(a.persona_id);
          const c = a.cargo_id ? cargosMap.get(a.cargo_id) : null;
          return {
            servidor: p ? `${p.nombres} ${p.apellidos}` : "—",
            cargo: c?.nombre || "—",
            tipo: getCargoTipo(c?.nombre) || "—",
            estado: a.estado,
            asistencia: a.asistencia || "—",
            telefono: p?.telefono || p?.whatsapp || "—",
          };
        });
      map.set(e.id, filas);
    });
    exportMinisterioProgramaPDF({
      ministerioNombre: m.nombre,
      color: m.color,
      eventos: proxEventos,
      filasPorEvento: map,
    });
    toast.success(`PDF generado para ${m.nombre}`);
  };

  const cargarPlantillaIso = async (m: ProgMinisterio) => {
    const tpl = findIsoTemplate(m.nombre);
    if (!tpl) return toast.error("Este ministerio no tiene plantilla ISO definida");
    const existentes = new Set(cargos.filter((c) => c.ministerio_id === m.id).map((c) => normKey(c.nombre)));
    let creados = 0;
    try {
      for (let i = 0; i < tpl.estaciones.length; i++) {
        const est = tpl.estaciones[i];
        if (existentes.has(normKey(est))) continue;
        await upCar.mutateAsync({ ministerio_id: m.id, nombre: est, orden: i, cupo: 1 });
        creados++;
      }
      toast.success(creados > 0 ? `${creados} cargos creados desde ${tpl.codigo}` : `Todas las estaciones ya existen (${tpl.codigo})`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Ministerios y Cargos</h3>
        <Dialog open={openMin} onOpenChange={(o) => { setOpenMin(o); if (!o) setEditMin({}); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo ministerio</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editMin.id ? "Editar" : "Nuevo"} ministerio</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={editMin.nombre || ""} onChange={(e) => setEditMin({ ...editMin, nombre: e.target.value })} /></div>
              <div><Label>Color</Label><Input type="color" value={editMin.color || "#2563eb"} onChange={(e) => setEditMin({ ...editMin, color: e.target.value })} /></div>
              <div><Label>Descripción</Label><Input value={editMin.descripcion || ""} onChange={(e) => setEditMin({ ...editMin, descripcion: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={saveMin}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ministerios.map((m) => {
          const list = cargos.filter((c) => c.ministerio_id === m.id);
          return (
            <Card key={m.id} className="overflow-hidden">
              <div className="h-1.5" style={{ background: m.color || "#2563eb" }} />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{m.nombre}</CardTitle>
                    {findIsoTemplate(m.nombre) && (
                      <Badge variant="outline" className="mt-1 text-[10px]">ISO {findIsoTemplate(m.nombre)!.codigo}</Badge>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {findIsoTemplate(m.nombre) && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Cargar estaciones ISO como cargos" onClick={() => cargarPlantillaIso(m)}><FileText className="h-3.5 w-3.5" /></Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Descargar PDF de programación" onClick={() => descargarPdfMinisterio(m)}><FileDown className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditMin(m); setOpenMin(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("¿Eliminar ministerio y sus cargos?")) delMin.mutate(m.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {list.map((c) => (
                    <Badge key={c.id} variant="secondary" className="gap-1.5 pr-1">
                      {c.nombre}
                      <button onClick={() => delCar.mutate(c.id)} className="hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                  {list.length === 0 && <span className="text-xs text-muted-foreground">Sin cargos</span>}
                </div>
                <Dialog open={openCar === m.id} onOpenChange={(o) => { setOpenCar(o ? m.id : null); setEditCar(o ? { ministerio_id: m.id } : {}); }}>
                  <DialogTrigger asChild><Button size="sm" variant="outline" className="w-full"><Users className="h-3.5 w-3.5 mr-1" />Gestionar cargos</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Cargos de {m.nombre}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-end">
                        <div><Label>Nombre</Label><Input value={editCar.nombre || ""} onChange={(e) => setEditCar({ ...editCar, nombre: e.target.value })} /></div>
                        <div><Label>Orden</Label><Input type="number" value={editCar.orden ?? 0} onChange={(e) => setEditCar({ ...editCar, orden: +e.target.value })} /></div>
                        <div><Label>Cupo</Label><Input type="number" value={editCar.cupo ?? 1} onChange={(e) => setEditCar({ ...editCar, cupo: +e.target.value })} /></div>
                        <Button onClick={saveCar}>+</Button>
                      </div>
                      <div className="border-t pt-2 max-h-72 overflow-auto">
                        {list.map((c) => (
                          <div key={c.id} className="flex justify-between items-center py-1.5 text-sm">
                            <span>{c.orden}. {c.nombre} <span className="text-muted-foreground text-xs">(cupo {c.cupo})</span></span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => delCar.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
