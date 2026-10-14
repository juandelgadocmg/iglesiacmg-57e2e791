import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePersona } from "@/hooks/useDatabase";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (persona: { id: string; nombres: string; apellidos: string }) => void;
  initialName?: string;
}

const EMPTY = { nombres: "", apellidos: "", documento: "", telefono: "", email: "" };

/** Registro rápido de un padre / acudiente como persona de la iglesia. */
export function RegistrarAcudienteModal({ open, onOpenChange, onCreated, initialName }: Props) {
  const createPersona = useCreatePersona();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) {
      const [first, ...rest] = (initialName || "").trim().split(/\s+/);
      setForm({ ...EMPTY, nombres: first || "", apellidos: rest.join(" ") });
    }
  }, [open, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // evita enviar el formulario padre (Vincular)
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      toast.error("Nombres y apellidos son obligatorios.");
      return;
    }
    if (!form.telefono.trim()) {
      toast.error("El teléfono / WhatsApp es obligatorio para poder notificar al acudiente.");
      return;
    }
    try {
      const created: any = await createPersona.mutateAsync({
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        documento: form.documento.trim() || null,
        telefono: form.telefono.trim(),
        whatsapp: form.telefono.trim(),
        email: form.email.trim() || null,
        tipos_persona: ["Acudiente"],
      } as any);
      toast.success("Acudiente registrado");
      if (created?.id) onCreated?.(created);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Error al registrar acudiente: " + (err?.message || ""));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden border-0 shadow-2xl">
        <div className="h-2 w-full bg-gradient-to-r from-coral to-orange-400" />
        <DialogHeader className="px-6 pt-4">
          <DialogTitle className="text-xl font-bold text-navy">Registrar Padre / Acudiente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acu_nombres">Nombres *</Label>
              <Input id="acu_nombres" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} required className="h-11 rounded-xl bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acu_apellidos">Apellidos *</Label>
              <Input id="acu_apellidos" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} required className="h-11 rounded-xl bg-slate-50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acu_documento">Documento</Label>
            <Input id="acu_documento" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} className="h-11 rounded-xl bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acu_telefono">Teléfono / WhatsApp *</Label>
            <Input id="acu_telefono" type="tel" placeholder="Ej. 300 123 4567" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required className="h-11 rounded-xl bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acu_email">Correo electrónico</Label>
            <Input id="acu_email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 rounded-xl bg-slate-50" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={createPersona.isPending} className="bg-navy hover:bg-navy/90 text-white rounded-xl px-8">
              {createPersona.isPending ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RegistrarAcudienteModal;
