import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, Flame, MessageCircle, Pencil, Trash2, User } from "lucide-react";
import { useState } from "react";
import { useUpdatePeticion, useDeletePeticion } from "@/hooks/usePeticiones";
import { toast } from "sonner";
import { fueContactadoPorWhatsApp, ultimoContactoWhatsApp } from "@/lib/whatsapp";

const ESTADOS = ["Pendiente", "En oración", "Respondida", "Archivada"] as const;

interface Props {
  peticion: any;
  onEdit: (p: any) => void;
  onWhatsApp: (p: any) => void;
  onClose: () => void;
}

export default function PeticionDetailDock({ peticion, onEdit, onWhatsApp, onClose }: Props) {
  const update = useUpdatePeticion();
  const del = useDeletePeticion();
  const [nota, setNota] = useState("");
  if (!peticion) return null;

  const contactado = fueContactadoPorWhatsApp(peticion.notas_seguimiento);

  const changeEstado = async (estado: string) => {
    const payload: any = { id: peticion.id, estado };
    if (estado === "Respondida") payload.fecha_respuesta = new Date().toISOString().split("T")[0];
    await update.mutateAsync(payload);
    toast.success(`Movida a ${estado}`);
  };

  const addNota = async () => {
    if (!nota.trim()) return;
    const stamp = format(new Date(), "dd/MM/yyyy HH:mm");
    const prev = peticion.notas_seguimiento || "";
    const nuevo = `${prev ? prev + "\n\n" : ""}[${stamp}] ${nota.trim()}`;
    await update.mutateAsync({ id: peticion.id, notas_seguimiento: nuevo });
    setNota("");
    toast.success("Nota añadida");
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground leading-tight">{peticion.titulo}</h2>
          <Badge variant="outline" className="shrink-0">{peticion.estado}</Badge>
        </div>
        {peticion.personas && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> {peticion.personas.nombres} {peticion.personas.apellidos}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {peticion.tipo && <Badge variant="secondary">{peticion.tipo}</Badge>}
          <Badge variant="outline" className="gap-1"><Flame className="h-3 w-3" />{peticion.prioridad}</Badge>
          {peticion.created_at && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {format(parseISO(peticion.created_at), "dd MMM yyyy", { locale: es })}
            </span>
          )}
        </div>
      </div>

      {peticion.descripcion && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Descripción</h3>
          <p className="text-sm whitespace-pre-line text-foreground">{peticion.descripcion}</p>
        </div>
      )}

      <Separator />

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Mover a</h3>
        <div className="grid grid-cols-2 gap-2">
          {ESTADOS.filter(e => e !== peticion.estado).map(e => (
            <Button key={e} variant="outline" size="sm" onClick={() => changeEstado(e)}>{e}</Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Seguimiento</h3>
          {contactado && (
            <Badge className="bg-success/15 text-success border-success/40 gap-1" variant="outline">
              <MessageCircle className="h-3 w-3" /> WA {ultimoContactoWhatsApp(peticion.notas_seguimiento)}
            </Badge>
          )}
        </div>
        {peticion.notas_seguimiento ? (
          <div className="text-xs whitespace-pre-line text-muted-foreground bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto">
            {peticion.notas_seguimiento}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sin notas todavía</p>
        )}
        <Textarea
          placeholder="Añadir nota de seguimiento pastoral…"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="mt-2 text-sm"
          rows={3}
        />
        <Button size="sm" onClick={addNota} disabled={!nota.trim()} className="mt-2">Añadir nota</Button>
      </div>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 text-success border-success/40" onClick={() => onWhatsApp(peticion)}>
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </Button>
        {peticion.estado !== "Respondida" && (
          <Button size="sm" className="gap-1.5" onClick={() => changeEstado("Respondida")}>
            <CheckCircle2 className="h-4 w-4" /> Marcar respondida
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onEdit(peticion)}>
          <Pencil className="h-4 w-4" /> Editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-destructive ml-auto"
          onClick={async () => {
            if (!confirm(`¿Eliminar "${peticion.titulo}"?`)) return;
            await del.mutateAsync(peticion.id);
            toast.success("Eliminada");
            onClose();
          }}
        >
          <Trash2 className="h-4 w-4" /> Eliminar
        </Button>
      </div>
    </div>
  );
}
