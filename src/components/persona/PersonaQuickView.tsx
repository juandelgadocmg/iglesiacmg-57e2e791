import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Phone, Mail, MapPin, Users, Calendar, ExternalLink, Star, Pencil, MessageSquare,
} from "lucide-react";
import { Icon } from "@/design-system/primitives/Icon";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useUserPins } from "@/hooks/useUserPins";
import { useContextDock } from "@/components/layout/context-dock/ContextDock";

export default function PersonaQuickView({ persona, onEdit }: { persona: any; onEdit?: (p: any) => void }) {
  const nav = useNavigate();
  const { toggle, isPinned } = useUserPins();
  const dock = useContextDock();
  if (!persona) return <div className="p-4 text-sm text-muted-foreground">Cargando datos...</div>;

  const p = persona;
  const tipos: string[] = [p.tipo_persona, ...(Array.isArray(p.tipos_persona) ? p.tipos_persona : [])].filter(Boolean);
  const pinned = isPinned(`persona:${p.id}`);

  const formatDateSafe = (dStr: string) => {
    if (!dStr) return "";
    try {
      return format(parseISO(dStr), "dd MMM yyyy", { locale: es });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="doxa-body font-bold bg-primary/10 text-primary">
            {p.nombres?.[0]}{p.apellidos?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="doxa-h4 truncate">{p.nombres} {p.apellidos}</h2>
          <div className="flex flex-wrap gap-1 mt-2">
            {tipos.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="doxa-caption">{t}</Badge>
            ))}
            {p.estado_iglesia && (
              <Badge variant="outline" className="doxa-caption">{p.estado_iglesia}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" className="w-full" onClick={() => { dock.close(); nav(`/personas/${p.id}`); }}>
          <ExternalLink className="h-3.5 w-3.5 mr-2" /> Perfil completo
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit?.(p)}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toggle({ id: `persona:${p.id}`, kind: "persona", label: `${p.nombres} ${p.apellidos}`, to: `/personas/${p.id}` })}
        >
          <Star className={`h-3.5 w-3.5 mr-2 ${pinned ? "fill-amber-400 text-amber-500" : ""}`} />
          {pinned ? "Anclado" : "Anclar"}
        </Button>
        {p.telefono && (
          <Button asChild size="sm" variant="outline">
            <a
              href={`https://web.whatsapp.com/send?phone=${(p.telefono || "").replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-2 text-emerald-600" /> WhatsApp
            </a>
          </Button>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        {p.telefono && <InfoRow icon={Phone} label="Teléfono" value={p.telefono} />}
        {p.email && <InfoRow icon={Mail} label="Email" value={p.email} />}
        {p.direccion && <InfoRow icon={MapPin} label="Dirección" value={p.direccion} />}
        {(p as any).grupos?.nombre && <InfoRow icon={Users} label="Grupo" value={(p as any).grupos.nombre} />}
        {p.fecha_nacimiento && (
          <InfoRow icon={Calendar} label="Nacimiento" value={formatDateSafe(p.fecha_nacimiento)} />
        )}
        {p.ministerio && <InfoRow icon={Users} label="Ministerio" value={p.ministerio} />}
        {p.ocupacion && <InfoRow icon={Users} label="Ocupación" value={p.ocupacion} />}
      </div>

      {p.notas && (
        <>
          <Separator />
          <div>
            <div className="doxa-caption uppercase tracking-wider text-muted-foreground mb-1">Notas</div>
            <p className="doxa-body-sm text-muted-foreground whitespace-pre-wrap">{p.notas}</p>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon icon={icon} size="sm" className="mt-0.5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="doxa-caption uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="doxa-body-sm truncate">{value}</div>
      </div>
    </div>
  );
}
