import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, UserCheck, Link as LinkIcon, UserPlus } from "lucide-react";
import { useNinos } from "../hooks/useNinos";
import { usePersonas } from "@/hooks/useDatabase";
import { SearchableSelect } from "./SearchableSelect";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama con la persona creada o vinculada (útil para auto-seleccionarla). */
  onCreated?: (persona: { id: string; nombres: string; apellidos: string }) => void;
  /** Texto para precargar el nombre (ej. lo que el usuario buscó). */
  initialName?: string;
}

export function RegistrarNinoModal({ open, onOpenChange, onCreated, initialName }: Props) {
  const { registrarNino } = useNinos();
  const { data: personas = [] } = usePersonas();
  const [tab, setTab] = useState<"nuevo" | "vincular">("nuevo");
  const [loading, setLoading] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");

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

  // Detectar duplicados en tiempo real si el usuario escribe nombre o documento similar
  const detectedDuplicate = useMemo(() => {
    if (tab !== "nuevo") return null;
    const cleanDoc = formData.documento.trim().toLowerCase();
    const cleanName = `${formData.nombres} ${formData.apellidos}`.trim().toLowerCase();
    if (!cleanDoc && cleanName.length < 5) return null;

    return personas.find(p => {
      const pDoc = (p.documento || "").trim().toLowerCase();
      const pName = `${p.nombres ?? ""} ${p.apellidos ?? ""}`.trim().toLowerCase();
      if (cleanDoc && pDoc && cleanDoc === pDoc) return true;
      if (cleanName.length >= 6 && pName === cleanName) return true;
      return false;
    }) || null;
  }, [formData.nombres, formData.apellidos, formData.documento, personas, tab]);

  // Manejar selección de persona existente para vincular
  const handleSelectPersonaToLink = (personaId: string) => {
    setSelectedPersonaId(personaId);
    const p = personas.find(x => x.id === personaId);
    if (!p) return;
    setFormData(prev => ({
      ...prev,
      nombres: p.nombres || "",
      apellidos: p.apellidos || "",
      documento: p.documento || "",
      fecha_nacimiento: p.fecha_nacimiento || "",
      sexo: (p.sexo === "F" ? "F" : "M") as "M" | "F",
      contacto_emergencia: p.telefono || prev.contacto_emergencia
    }));
  };

  const handleUseExisting = (persona: any) => {
    setTab("vincular");
    handleSelectPersonaToLink(persona.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isLinking = tab === "vincular" && !!selectedPersonaId;
      const created = await registrarNino.mutateAsync({
        ...(isLinking ? { id: selectedPersonaId } : {}),
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
      // Reset form
      setSelectedPersonaId("");
      setTab("nuevo");
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

  const personaOptions = useMemo(() => {
    return personas.map(p => ({
      value: p.id,
      label: `${p.nombres ?? ""} ${p.apellidos ?? ""}`.trim(),
      hint: p.documento ? `Doc: ${p.documento}` : undefined
    })).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [personas]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-navy flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-coral" /> Registrar Niño en Iglesia Infantil
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Los registros infantiles se asignan al ministerio infantil sin alterar la lista de membresía general.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "nuevo" | "vincular")} className="w-full mt-2">
          <TabsList className="grid grid-cols-2 w-full bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="nuevo" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Nuevo Niño
            </TabsTrigger>
            <TabsTrigger value="vincular" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
              <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Vincular Existente
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 py-3">
            {tab === "vincular" && (
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
                <Label className="text-xs font-bold text-blue-900">Seleccionar persona registrada en la iglesia:</Label>
                <SearchableSelect
                  options={personaOptions}
                  value={selectedPersonaId}
                  onChange={handleSelectPersonaToLink}
                  placeholder="Buscar por nombre o documento..."
                  searchPlaceholder="Escribe el nombre del niño/a..."
                  emptyText="No se encontraron personas."
                />
                <p className="text-[11px] text-blue-700">
                  Esto evitará crear un duplicado en el sistema y agregará el rol "Niño" a su ficha existente.
                </p>
              </div>
            )}

            {/* Alerta de duplicado detectado en tiempo real */}
            {tab === "nuevo" && detectedDuplicate && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs flex-1">
                  <p className="font-bold">Posible duplicado detectado</p>
                  <p className="text-slate-600 mt-0.5">
                    Ya existe una persona registrada como: <span className="font-semibold text-slate-900">{detectedDuplicate.nombres} {detectedDuplicate.apellidos}</span>
                    {detectedDuplicate.documento ? ` (Doc: ${detectedDuplicate.documento})` : ""}.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseExisting(detectedDuplicate)}
                    className="mt-2 h-7 text-xs bg-white border-amber-300 text-amber-900 hover:bg-amber-100/50"
                  >
                    <UserCheck className="w-3 h-3 mr-1" /> Vincular existente y no duplicar
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nombres" className="text-xs font-semibold">Nombres *</Label>
                <Input 
                  id="nombres" 
                  required 
                  value={formData.nombres}
                  onChange={(e) => handleChange("nombres", e.target.value)}
                  placeholder="Nombres del niño"
                  className="h-10 text-sm rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apellidos" className="text-xs font-semibold">Apellidos *</Label>
                <Input 
                  id="apellidos" 
                  required 
                  value={formData.apellidos}
                  onChange={(e) => handleChange("apellidos", e.target.value)}
                  placeholder="Apellidos"
                  className="h-10 text-sm rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="documento_nino" className="text-xs font-semibold">Documento (T.I. / Registro civil)</Label>
              <Input
                id="documento_nino"
                value={formData.documento}
                onChange={(e) => handleChange("documento", e.target.value)}
                placeholder="Número de documento"
                className="h-10 text-sm rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fecha_nacimiento" className="text-xs font-semibold">Fecha de Nacimiento</Label>
                <Input 
                  id="fecha_nacimiento" 
                  type="date"
                  value={formData.fecha_nacimiento}
                  onChange={(e) => handleChange("fecha_nacimiento", e.target.value)}
                  className="h-10 text-sm rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Género</Label>
                <Select 
                  value={formData.sexo} 
                  onValueChange={(value: "M" | "F") => handleChange("sexo", value)}
                >
                  <SelectTrigger className="h-10 text-sm rounded-lg">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contacto_emergencia" className="text-xs font-semibold">Teléfono de Emergencia / Acudiente</Label>
              <Input 
                id="contacto_emergencia" 
                placeholder="Ej. +57 300 1234567"
                value={formData.contacto_emergencia}
                onChange={(e) => handleChange("contacto_emergencia", e.target.value)}
                className="h-10 text-sm rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alergias" className="text-xs font-semibold">Alergias Conocidas</Label>
              <Input 
                id="alergias" 
                placeholder="Ej. Ninguna, Alergia al maní, lactosa..."
                value={formData.alergias}
                onChange={(e) => handleChange("alergias", e.target.value)}
                className="h-10 text-sm rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="info_medica" className="text-xs font-semibold">Información Médica Relevante</Label>
              <Textarea 
                id="info_medica" 
                placeholder="Medicamentos, condiciones especiales, recomendaciones..."
                value={formData.info_medica}
                onChange={(e) => handleChange("info_medica", e.target.value)}
                className="text-sm rounded-lg min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-navy hover:bg-navy/90 text-white rounded-xl">
                {loading ? "Guardando..." : tab === "vincular" ? "Vincular a Infantil" : "Guardar Registro"}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
