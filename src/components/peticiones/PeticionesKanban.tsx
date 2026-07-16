import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Flame, MessageCircle, MoreHorizontal, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { fueContactadoPorWhatsApp } from "@/lib/whatsapp";
import { useUpdatePeticion } from "@/hooks/usePeticiones";
import { toast } from "sonner";

const COLUMNS = [
  { id: "Pendiente", label: "Pendiente", accent: "border-t-warning", dot: "bg-warning" },
  { id: "En oración", label: "En oración", accent: "border-t-info", dot: "bg-info" },
  { id: "Respondida", label: "Respondida", accent: "border-t-success", dot: "bg-success" },
  { id: "Archivada", label: "Archivada", accent: "border-t-muted-foreground/40", dot: "bg-muted-foreground/60" },
] as const;

const prioridadColor: Record<string, string> = {
  Baja: "bg-muted text-muted-foreground",
  Normal: "bg-info/10 text-info",
  Alta: "bg-warning/10 text-warning",
  Urgente: "bg-destructive/10 text-destructive",
};

interface Props {
  peticiones: any[];
  onOpen: (p: any) => void;
  onWhatsApp: (p: any) => void;
}

export default function PeticionesKanban({ peticiones, onOpen, onWhatsApp }: Props) {
  const update = useUpdatePeticion();
  const [dragOver, setDragOver] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = { "Pendiente": [], "En oración": [], "Respondida": [], "Archivada": [] };
    peticiones.forEach(p => {
      const key = g[p.estado] ? p.estado : "Pendiente";
      g[key].push(p);
    });
    // sort by prioridad + fecha
    const orden: Record<string, number> = { Urgente: 0, Alta: 1, Normal: 2, Baja: 3 };
    Object.keys(g).forEach(k => {
      g[k].sort((a, b) => (orden[a.prioridad] ?? 9) - (orden[b.prioridad] ?? 9));
    });
    return g;
  }, [peticiones]);

  const handleDrop = async (estado: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const p = peticiones.find(x => x.id === id);
    if (!p || p.estado === estado) return;
    const payload: any = { id, estado };
    if (estado === "Respondida") payload.fecha_respuesta = new Date().toISOString().split("T")[0];
    await update.mutateAsync(payload);
    toast.success(`Movida a ${estado}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map(col => {
        const items = grouped[col.id] || [];
        const isOver = dragOver === col.id;
        return (
          <div
            key={col.id}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
            onDragLeave={() => setDragOver(prev => prev === col.id ? null : prev)}
            onDrop={(e) => handleDrop(col.id, e)}
            className={cn(
              "bg-muted/30 rounded-xl border border-transparent flex flex-col min-h-[400px] transition-colors",
              isOver && "border-primary/60 bg-primary/5"
            )}
          >
            <div className={cn("flex items-center justify-between px-4 pt-4 pb-3 border-t-4 rounded-t-xl bg-card/60", col.accent)}>
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">{items.length}</Badge>
              </div>
            </div>
            <div className="flex-1 px-3 pb-3 pt-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
              {items.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8 italic">Sin peticiones</div>
              ) : items.map(p => {
                const contactado = fueContactadoPorWhatsApp(p.notas_seguimiento);
                const seg = p.fecha_seguimiento ? parseISO(p.fecha_seguimiento) : null;
                const segVencido = seg && isPast(seg) && p.estado !== "Respondida";
                const dias = p.created_at ? differenceInDays(new Date(), parseISO(p.created_at)) : 0;
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "move"; }}
                    onClick={() => onOpen(p)}
                    className="group bg-card border rounded-lg p-3 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug flex-1">{p.titulo}</h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => { e.stopPropagation(); onOpen(p); }}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {p.personas && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{p.personas.nombres} {p.personas.apellidos}</span>
                      </p>
                    )}

                    {p.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.descripcion}</p>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className={cn(prioridadColor[p.prioridad], "text-[10px] gap-0.5 h-5")} variant="secondary">
                        <Flame className="h-2.5 w-2.5" />{p.prioridad}
                      </Badge>
                      {p.tipo && <Badge variant="outline" className="text-[10px] h-5">{p.tipo}</Badge>}
                      {contactado && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] gap-0.5 h-5">
                          <MessageCircle className="h-2.5 w-2.5" /> WA
                        </Badge>
                      )}
                      {segVencido && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] gap-0.5 h-5">
                          <Clock className="h-2.5 w-2.5" /> Seguimiento vencido
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[10px] text-muted-foreground">
                      <span>{p.created_at ? format(parseISO(p.created_at), "dd MMM", { locale: es }) : "—"}</span>
                      {dias > 0 && p.estado !== "Respondida" && p.estado !== "Archivada" && (
                        <span className={cn(dias > 14 && "text-warning font-medium")}>Hace {dias}d</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
