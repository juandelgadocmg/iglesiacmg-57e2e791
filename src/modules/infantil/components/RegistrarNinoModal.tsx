import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNinos } from "../hooks/useNinos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama con la persona creada (útil para auto-seleccionarla). */
  onCreated?: (persona: { id: string; nombres: string; apellidos: string }) => void;
  /** Texto para precargar el nombre (ej. lo que el usuario buscó). */
  initialName?: string;
}

export function RegistrarNinoModal({ open, onOpenChange, onCreated, initialName }: Props) {
  const { registrarNino } = useNinos();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    documento: "",
    fecha_nacimiento: "",
    sexo: "M" as "M" | "F",
    alergias: "",
    info_medica: "",
    contacto_emergencia: "",
  });

  useEffect(() => {
    if (open && initialName) {
      const [first, ...rest] = initialName.trim().split(/\s+/);
      setFormData(prev => ({ ...prev, nombres: first || "", apellidos: rest.join(" ") }));
    }
  }, [open, initialName]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const created = await registrarNino.mutateAsync({
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        documento: formData.documento || undefined,
        fecha_nacimiento: formData.fecha_nacimiento || undefined,
        sexo: formData.sexo,
        detalles: {
          alergias: formData.alergias,
          info_medica: formData.info_medica,
          contacto_emergencia: formData.contacto_emergencia
        }
      });
      if (created) onCreated?.(created as any);
      onOpenChange(false);
      setFormData({
        nombres: "", apellidos: "", documento: "", fecha_nacimiento: "", sexo: "M",
        alergias: "", info_medica: "", contacto_emergencia: ""
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Niño</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombres">Nombres *</Label>
              <Input 
                id="nombres" 
                required 
                value={formData.nombres}
                onChange={(e) => handleChange("nombres", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos *</Label>
              <Input 
                id="apellidos" 
                required 
                value={formData.apellidos}
                onChange={(e) => handleChange("apellidos", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documento_nino">Documento (T.I. / Registro civil)</Label>
            <Input
              id="documento_nino"
              value={formData.documento}
              onChange={(e) => handleChange("documento", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
              <Input 
                id="fecha_nacimiento" 
                type="date"
                value={formData.fecha_nacimiento}
                onChange={(e) => handleChange("fecha_nacimiento", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Género</Label>
              <Select 
                value={formData.sexo} 
                onValueChange={(value: "M" | "F") => handleChange("sexo", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contacto_emergencia">Teléfono de Emergencia</Label>
            <Input 
              id="contacto_emergencia" 
              placeholder="Ej. +57 300..."
              value={formData.contacto_emergencia}
              onChange={(e) => handleChange("contacto_emergencia", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alergias">Alergias Conocidas</Label>
            <Input 
              id="alergias" 
              placeholder="Ninguna"
              value={formData.alergias}
              onChange={(e) => handleChange("alergias", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="info_medica">Información Médica Relevante</Label>
            <Textarea 
              id="info_medica" 
              placeholder="Medicamentos, condiciones..."
              value={formData.info_medica}
              onChange={(e) => handleChange("info_medica", e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
