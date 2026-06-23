import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useProgMinisterios, useProgCargos, useUpsertMinisterio, useDeleteMinisterio, useUpsertCargo, useDeleteCargo, type ProgMinisterio, type ProgCargo } from "@/hooks/usePrograma";

export default function MinisteriosPanel() {
  const { data: ministerios = [] } = useProgMinisterios();
  const { data: cargos = [] } = useProgCargos();
  const upMin = useUpsertMinisterio();
  const delMin = useDeleteMinisterio();
  const upCar = useUpsertCargo();
  const delCar = useDeleteCargo();

  const [openMin, setOpenMin] = useState(false);
  const [editMin, setEditMin] = useState<Partial<ProgMinisterio>>({});
  const [openCar, setOpenCar] = useState<string | null>(null);
  const [editCar, setEditCar] = useState<Partial<ProgCargo>>({});

  const saveMin = async () => {
    if (!editMin.nombre) return toast.error("Nombre requerido");
    try { await upMin.mutateAsync(editMin); toast.success("Ministerio guardado"); setOpenMin(false); setEditMin({}); } catch (e: any) { toast.error(e.message); }
  };
  const saveCar = async () => {
    if (!editCar.nombre || !editCar.ministerio_id) return;
    try { await upCar.mutateAsync({ ...editCar, cupo: editCar.cupo || 1 }); toast.success("Cargo guardado"); setEditCar({ ministerio_id: editCar.ministerio_id }); } catch (e: any) { toast.error(e.message); }
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
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{m.nombre}</CardTitle>
                  <div className="flex gap-1">
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
