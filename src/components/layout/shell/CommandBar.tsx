import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  Home, Users, UsersRound, Church, CalendarDays, GraduationCap, BookMarked,
  Award, DollarSign, BarChart3, HandHeart, LifeBuoy, Mail, Settings,
  UserCog, ShieldCheck, Plus, QrCode, Search, ArrowRight, Clock, Star,
} from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useActiveRole } from "@/hooks/useActiveRole";
import { canAccess } from "@/lib/permissions";
import { useRecentEntities } from "@/hooks/useRecentEntities";
import { useUserPins } from "@/hooks/useUserPins";
import { supabase } from "@/integrations/supabase/client";

interface Props { open: boolean; onOpenChange: (o: boolean) => void }

type NavCmd = { label: string; to: string; icon: any; hint?: string };

const NAV_COMMANDS: NavCmd[] = [
  { label: "Hoy", to: "/hoy", icon: Home, hint: "g h" },
  { label: "Personas", to: "/personas", icon: Users, hint: "g p" },
  { label: "Grupos", to: "/grupos", icon: UsersRound, hint: "g g" },
  { label: "Reuniones", to: "/servicios", icon: Church, hint: "g r" },
  { label: "Eventos", to: "/eventos", icon: CalendarDays },
  { label: "Academia", to: "/academia", icon: GraduationCap },
  { label: "Seminario", to: "/seminario", icon: BookMarked },
  { label: "Certificados", to: "/certificados", icon: Award },
  { label: "Finanzas", to: "/finanzas", icon: DollarSign },
  { label: "Mensajes", to: "/mensajes", icon: Mail },
  { label: "Peticiones", to: "/peticiones", icon: HandHeart },
  { label: "Reportes", to: "/reportes", icon: BarChart3 },
  { label: "Chat IA", to: "/chat", icon: MessageCircle },
  { label: "Usuarios", to: "/usuarios", icon: UserCog },
  { label: "Configuración", to: "/configuracion", icon: Settings },
  { label: "Seguridad", to: "/seguridad", icon: ShieldCheck },
];

const ACTIONS = [
  { label: "Nueva persona", to: "/personas?new=1", icon: Plus },
  { label: "Nueva petición", to: "/peticiones?new=1", icon: Plus },
  { label: "Nuevo evento", to: "/eventos?new=1", icon: Plus },
  { label: "Nuevo mensaje", to: "/mensajes?new=1", icon: Plus },
  { label: "Registrar asistencia (QR)", to: "/servicios?tab=checkin", icon: QrCode },
];

export default function CommandBar({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { roles } = useUserRoles();
  const { activeRole } = useActiveRole();
  const effective = activeRole ? [activeRole as any] : roles;
  const { items: recents } = useRecentEntities();
  const { pins } = useUserPins();
  const [query, setQuery] = useState("");
  const [personas, setPersonas] = useState<any[]>([]);

  const navFiltered = useMemo(
    () => NAV_COMMANDS.filter((n) => canAccess(effective, n.to.split("?")[0])),
    [effective]
  );

  // Búsqueda en personas
  useEffect(() => {
    if (!open || query.length < 2) { setPersonas([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("personas")
        .select("id,nombres,apellidos,documento_numero,telefono")
        .or(`nombres.ilike.%${query}%,apellidos.ilike.%${query}%,documento_numero.ilike.%${query}%,telefono.ilike.%${query}%`)
        .limit(6);
      setPersonas(data || []);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  const go = (to: string) => { onOpenChange(false); setQuery(""); navigate(to); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar personas, grupos, acciones…  (⌘K)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[440px]">
        <CommandEmpty>Sin resultados</CommandEmpty>

        {personas.length > 0 && (
          <>
            <CommandGroup heading="Personas">
              {personas.map((p) => (
                <CommandItem key={p.id} value={`persona-${p.id}-${p.nombres}`}
                  onSelect={() => go(`/personas/${p.id}`)}>
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="flex-1">{p.nombres} {p.apellidos}</span>
                  <span className="text-xs text-muted-foreground">{p.documento_numero || p.telefono}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {pins.length > 0 && (
          <>
            <CommandGroup heading="Favoritos">
              {pins.slice(0, 5).map((p) => (
                <CommandItem key={p.id} onSelect={() => go(p.to)}>
                  <Star className="h-4 w-4 mr-2 text-amber-500" />
                  <span className="flex-1">{p.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {recents.length > 0 && (
          <>
            <CommandGroup heading="Recientes">
              {recents.slice(0, 5).map((r) => (
                <CommandItem key={r.id} onSelect={() => go(r.to)}>
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="flex-1">{r.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Acciones rápidas">
          {ACTIONS.map((a) => (
            <CommandItem key={a.label} onSelect={() => go(a.to)}>
              <a.icon className="h-4 w-4 mr-2 text-primary" />
              <span className="flex-1">{a.label}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading="Ir a">
          {navFiltered.map((n) => (
            <CommandItem key={n.to} onSelect={() => go(n.to)}>
              <n.icon className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="flex-1">{n.label}</span>
              {n.hint && (
                <kbd className="text-[10px] text-muted-foreground border rounded px-1">{n.hint}</kbd>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
