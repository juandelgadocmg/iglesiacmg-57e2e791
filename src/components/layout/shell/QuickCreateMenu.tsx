import { Plus, UserPlus, HandHeart, CalendarPlus, Mail, QrCode, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCan } from "@/hooks/useCan";

export default function QuickCreateMenu() {
  const nav = useNavigate();
  const can = useCan();

  const items = [
    can("personas:create") && { label: "Nueva persona", icon: UserPlus, to: "/personas?new=1" },
    can("peticiones:create") && { label: "Nueva petición", icon: HandHeart, to: "/peticiones?new=1" },
    { label: "Nuevo evento", icon: CalendarPlus, to: "/eventos?new=1" },
    { label: "Nuevo mensaje", icon: Mail, to: "/mensajes?new=1" },
    { label: "Check-in QR", icon: QrCode, to: "/servicios?tab=checkin" },
    can("tesoreria_cdp:manage") && { label: "Registrar ingreso", icon: DollarSign, to: "/finanzas?new=ingreso" },
  ].filter(Boolean) as { label: string; icon: any; to: string }[];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 px-2.5">
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Crear</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Creación rápida</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((it) => (
          <DropdownMenuItem key={it.label} onClick={() => nav(it.to)} className="cursor-pointer">
            <it.icon className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm">{it.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
