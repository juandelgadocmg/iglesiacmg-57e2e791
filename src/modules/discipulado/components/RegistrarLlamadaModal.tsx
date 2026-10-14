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
import { toast } from "sonner";
import { useVisitas } from "../hooks/useVisitas";
import { PhoneCall } from "lucide-react";

interface RegistrarLlamadaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discipulos: any[];
  liderId: string;
  defaultDiscipuloId?: string;
  onSuccess: () => void;
}

export function RegistrarLlamadaModal({
  open,
  onOpenChange,
  discipulos,
  liderId,
  defaultDiscipuloId,
  onSuccess,
}: RegistrarLlamadaModalProps) {
  const { registrarLlamada, loading } = useVisitas();
  
  const [discipuloId, setDiscipuloId] = useState(defaultDiscipuloId || "");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [hora, setHora] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discipuloId) {
      toast.error("Por favor selecciona un discípulo");
      return;
    }

    const res = await registrarLlamada(discipuloId, liderId, fecha, hora, descripcion);
    
    if (res) {
      toast.success("Llamada registrada exitosamente");
      onSuccess();
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setDiscipuloId(defaultDiscipuloId || "");
    setFecha(new Date().toISOString().split("T")[0]);
    setHora("");
    setDescripcion("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-11/12 sm:w-full rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <PhoneCall className="w-5 h-5 text-blue-600" />
            Registrar Llamada
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
            <Label className="text-sm font-semibold text-slate-700">Motivo / Resumen de la llamada</Label>
            <Textarea 
              value={descripcion} 
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Escribe un breve resumen de lo conversado..."
              rows={3}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full font-bold"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
              disabled={loading}
            >
              {loading ? "Registrando..." : "Guardar Llamada"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
