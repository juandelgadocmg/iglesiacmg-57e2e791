import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useVisitas } from "../hooks/useVisitas";
import { Home } from "lucide-react";

interface RegistrarVisitaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discipulos: any[];
  liderId: string;
  defaultDiscipuloId?: string;
  onSuccess: () => void;
}

export function RegistrarVisitaModal({
  open,
  onOpenChange,
  discipulos,
  liderId,
  defaultDiscipuloId,
  onSuccess,
}: RegistrarVisitaModalProps) {
  const { registrarVisita, loading } = useVisitas();
  
  const [discipuloId, setDiscipuloId] = useState(defaultDiscipuloId || "");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [hora, setHora] = useState("");
  const [lugar, setLugar] = useState("Casa");
  const [direccion, setDireccion] = useState("");
  const [realizada, setRealizada] = useState(true);
  const [ungioCasa, setUngioCasa] = useState("No aplica");
  const [oro, setOro] = useState(false);
  const [enseno, setEnseno] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [proximoSeguimiento, setProximoSeguimiento] = useState("");
  const [compromiso, setCompromiso] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discipuloId) {
      toast.error("Por favor selecciona un discípulo");
      return;
    }

    const visita = {
      discipulo_id: discipuloId,
      lider_id: liderId,
      fecha,
      hora: hora || null,
      lugar,
      direccion: lugar === "Casa" ? direccion : null,
      realizada,
      ungio_casa: ungioCasa,
      oro,
      enseno,
      observaciones,
      proximo_seguimiento: proximoSeguimiento || null,
      compromiso
    };

    const res = await registrarVisita(visita);
    if (res) {
      toast.success("Visita registrada exitosamente");
      onSuccess();
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setDiscipuloId(defaultDiscipuloId || "");
    setFecha(new Date().toISOString().split("T")[0]);
    setHora("");
    setLugar("Casa");
    setDireccion("");
    setRealizada(true);
    setUngioCasa("No aplica");
    setOro(false);
    setEnseno(false);
    setObservaciones("");
    setProximoSeguimiento("");
    setCompromiso("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-11/12 max-h-[90vh] overflow-y-auto sm:w-full rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Home className="w-5 h-5 text-red-600" />
            Registrar Visita
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Discípulo</Label>
            <Select value={discipuloId} onValueChange={setDiscipuloId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un discípulo..." />
              </SelectTrigger>
              <SelectContent>
                {discipulos.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Hora</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Lugar de la visita</Label>
            <Select value={lugar} onValueChange={setLugar}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona lugar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Casa">Hogar / Casa</SelectItem>
                <SelectItem value="Iglesia">Iglesia</SelectItem>
                <SelectItem value="Casa de Paz">Casa de Paz</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {lugar === "Casa" && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Dirección</Label>
              <Input
                placeholder="Dirección aproximada"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg">
            <Label className="text-sm font-semibold text-slate-700">¿Se realizó la visita?</Label>
            <Switch checked={realizada} onCheckedChange={setRealizada} />
          </div>

          {realizada && (
            <div className="space-y-3 p-4 bg-slate-50 border rounded-xl">
              <h4 className="font-bold text-red-600 mb-2">V.E.O.</h4>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">¿Se enseñó la palabra?</Label>
                <Switch checked={enseno} onCheckedChange={setEnseno} />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">¿Se oró por la persona?</Label>
                <Switch checked={oro} onCheckedChange={setOro} />
              </div>

              <div className="space-y-2 mt-2 pt-2 border-t border-slate-200">
                <Label className="text-sm font-medium">¿Se ungió la casa?</Label>
                <Select value={ungioCasa} onValueChange={setUngioCasa}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sí">Sí</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                    <SelectItem value="No aplica">No aplica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Observaciones</Label>
            <Textarea
              placeholder="¿Qué ocurrió en la visita?"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="resize-none h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Próximo segumiento</Label>
              <Input type="date" value={proximoSeguimiento} onChange={(e) => setProximoSeguimiento(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Compromiso</Label>
              <Input placeholder="Ej. Asistir iglesia" value={compromiso} onChange={(e) => setCompromiso(e.target.value)} />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white font-bold">
              {loading ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
