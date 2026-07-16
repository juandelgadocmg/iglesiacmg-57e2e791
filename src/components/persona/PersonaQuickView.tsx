import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Phone, Mail, MapPin, Users, Calendar, ExternalLink, Star, Pencil, MessageSquare,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useUserPins } from "@/hooks/useUserPins";
import { useContextDock } from "@/components/layout/context-dock/ContextDock";

export default function PersonaQuickView({ persona, onEdit }: { persona: any; onEdit?: (p: any) => void }) {
  const nav = useNavigate();
  const { toggle, isPinned } = useUserPins();
  const dock = useContextDock();
  const p = persona;
  const tipos: string[] = [p.tipo_persona, ...(Array.isArray(p.tipos_persona) ? p.tipos_persona : [])].filter(Boolean);
  const pinned = isPinned(`persona:${p.id}`);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
            {p.nombres?.[0]}{p.apellidos?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{p.nombres} {p.apellidos}</h2>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tipos.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
            {p.estado_iglesia && (
              <Badge variant="outline" className="text-[10px]">{p.estado_iglesia}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" className="w-full" onClick={() => { dock.close(); nav(`/personas/${p.id}`); }}>
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Perfil completo
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit?.(p)}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toggle({ id: `persona:${p.id}`, kind: "persona", label: `${p.nombres} ${p.apellidos}`, to: `/personas/${p.id}` })}
        >
          <Star className={`h-3.5 w-3.5 mr-1.5 ${pinned ? "fill-amber-400 text-amber-500" : ""}`} />
          {pinned ? "Anclado" : "Anclar"}
        </Button>
        {p.telefono && (
          <a
            href={`https://web.whatsapp.com/send?phone=${(p.telefono || "").replace(/\D/g, "")}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 px-3 rounded-md border text-xs font-medium hover:bg-muted"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> WhatsApp
          </a>
        )}
      </div>

      <Separator />

      <div className="space-y-2 text-sm">
        {p.telefono && <InfoRow icon={Phone} label="Teléfono" value={p.telefono} />}
        {p.email && <InfoRow icon={Mail} label="Email" value={p.email} />}
        {p.direccion && <InfoRow icon={MapPin} label="Dirección" value={p.direccion} />}
        {(p as any).grupos?.nombre && <InfoRow icon={Users} label="Grupo" value={(p as any).grupos.nombre} />}
        {p.fecha_nacimiento && (
          <InfoRow icon={Calendar} label="Nacimiento" value={format(parseISO(p.fecha_nacimiento), "dd MMM yyyy", { locale: es })} />
        )}
        {p.ministerio && <InfoRow icon={Users} label="Ministerio" value={p.ministerio} />}
        {p.ocupacion && <InfoRow icon={Users} label="Ocupación" value={p.ocupacion} />}
      </div>

      {p.notas && (
        <>
          <Separator />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Notas</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.notas}</p>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-[13px] truncate">{value}</div>
      </div>
    </div>
  );
}
