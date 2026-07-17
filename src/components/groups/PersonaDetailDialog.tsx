import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Phone, Mail, MapPin, Loader2, Globe } from "lucide-react";
import { Icon } from "@/design-system/primitives/Icon";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useProcesos, usePersonaProcesos } from "@/hooks/usePersonaPerfil";

interface Props {
  persona: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const estadoBadgeClasses: Record<string, string> = {
  "Finalizado": "bg-green-600 text-white border-green-600",
  "Realizado": "bg-green-600 text-white border-green-600",
  "En Curso": "bg-slate-800 text-white border-slate-800 dark:bg-slate-600",
  "No Finalizado": "bg-red-600 text-white border-red-600",
  "No Realizado": "bg-red-600 text-white border-red-600",
  "No realizado": "bg-red-600 text-white border-red-600",
};

export default function PersonaDetailDialog({ persona, open, onOpenChange }: Props) {
  const { data: procesos, isLoading: loadingProcesos } = useProcesos();
  const { data: personaProcesos, isLoading: loadingPP } = usePersonaProcesos(persona?.id);

  const procesoMap = new Map((personaProcesos || []).map(pp => [pp.proceso_id, pp]));

  const totalProcesos = (procesos || []).length;
  const realizados = (procesos || []).filter(p => {
    const pp = procesoMap.get(p.id);
    return pp?.estado === "Realizado";
  }).length;
  const progressPct = totalProcesos > 0 ? Math.round((realizados / totalProcesos) * 100) : 0;

  if (!persona) return null;

  const displayEstado = (estado: string) => {
    if (estado === "Realizado") return "Finalizado";
    if (estado === "No Realizado" || estado === "No realizado" || estado === "No Finalizado") return "No Finalizado";
    if (estado === "En Curso") return "En Curso";
    return estado;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Información del Integrante</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={persona.foto_url || undefined} />
              <AvatarFallback className="doxa-body">{persona.nombres?.[0]}{persona.apellidos?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="doxa-h4">{persona.nombres} {persona.apellidos}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="doxa-caption">{persona.tipo_persona}</Badge>
                <Badge variant="secondary" className="doxa-caption">{persona.estado_iglesia}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact & personal info */}
          <div className="grid grid-cols-1 gap-3 doxa-body-sm">
            {persona.telefono && (
              <div className="flex items-center gap-2"><Icon icon={Phone} size="xs" className="text-muted-foreground" /><span>{persona.telefono}</span></div>
            )}
            {persona.email && (
              <div className="flex items-center gap-2"><Icon icon={Mail} size="xs" className="text-muted-foreground" /><span>{persona.email}</span></div>
            )}
            {persona.direccion && (
              <div className="flex items-center gap-2"><Icon icon={MapPin} size="xs" className="text-muted-foreground" /><span>{persona.direccion}</span></div>
            )}
            {persona.fecha_nacimiento && (
              <div><span className="text-muted-foreground">Fecha de nacimiento:</span> {format(parseISO(persona.fecha_nacimiento), "d 'de' MMMM 'de' yyyy", { locale: es })}</div>
            )}
            {persona.sexo && (
              <div><span className="text-muted-foreground">Sexo:</span> {persona.sexo}</div>
            )}
            {persona.estado_civil && (
              <div><span className="text-muted-foreground">Estado civil:</span> {persona.estado_civil}</div>
            )}
            {persona.ocupacion && (
              <div><span className="text-muted-foreground">Ocupación:</span> {persona.ocupacion}</div>
            )}
            {persona.vinculacion && (
              <div className="flex items-center gap-2"><Icon icon={Globe} size="xs" className="text-muted-foreground" /><span className="text-muted-foreground">Vinculación:</span> <span>{persona.vinculacion}</span></div>
            )}
            {persona.whatsapp && (
              <div><span className="text-muted-foreground">WhatsApp:</span> {persona.whatsapp}</div>
            )}
            {persona.ministerio && (
              <div><span className="text-muted-foreground">Ministerio:</span> {persona.ministerio}</div>
            )}
            {persona.observaciones && (
              <div><span className="text-muted-foreground">Observaciones:</span> {persona.observaciones}</div>
            )}
          </div>

          {/* Growth / Crecimiento */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="doxa-body-sm font-semibold">Procesos de Crecimiento</h4>
              <span className="doxa-caption text-muted-foreground">{realizados}/{totalProcesos} completados · {progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />

            {(loadingProcesos || loadingPP) ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Icon icon={Loader2} size="sm" className="animate-spin mr-2" /> Cargando...
              </div>
            ) : (procesos || []).length === 0 ? (
              <p className="doxa-caption text-muted-foreground text-center py-2">No hay procesos de crecimiento configurados</p>
            ) : (
              <div className="grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto pr-1">
                {(procesos || []).map((proc) => {
                  const pp = procesoMap.get(proc.id);
                  const rawEstado = pp?.estado || "No Realizado";
                  const estado = displayEstado(rawEstado);
                  const fecha = pp?.fecha_completado;
                  return (
                    <div key={proc.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 doxa-body-sm border-b border-border/50 last:border-0">
                      <span className={`flex-1 ${estado === "Finalizado" ? "text-muted-foreground" : ""}`}>
                        {proc.nombre}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={`doxa-caption px-3 py-0.5 rounded-full font-medium ${estadoBadgeClasses[estado] || estadoBadgeClasses["No Finalizado"]}`}
                        >
                          {estado}
                        </Badge>
                        {fecha && (
                          <span className="doxa-caption text-muted-foreground whitespace-nowrap">
                            {format(parseISO(fecha), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
