import { Sun, Moon, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";

const OPTIONS: { value: ThemeMode; label: string; icon: any; hint: string }[] = [
  { value: "light", label: "Claro", icon: Sun, hint: "Fondo blanco premium" },
  { value: "dark", label: "Oscuro", icon: Moon, hint: "Modo nocturno reposado" },
  { value: "system", label: "Sistema", icon: Monitor, hint: "Sigue tu dispositivo" },
];

export default function ThemeToggle() {
  const { mode, resolved, setMode } = useTheme();
  const Icon = resolved === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          title={`Tema: ${mode === "system" ? `Sistema (${resolved})` : mode}`}
          aria-label="Cambiar tema"
        >
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Apariencia
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((o) => {
          const O = o.icon;
          const active = mode === o.value;
          return (
            <DropdownMenuItem
              key={o.value}
              onClick={() => setMode(o.value)}
              className="cursor-pointer"
            >
              <O className="h-4 w-4 mr-2 text-muted-foreground" />
              <div className="flex flex-col flex-1">
                <span className="text-sm">{o.label}</span>
                <span className="text-[10.5px] text-muted-foreground">{o.hint}</span>
              </div>
              {active && <Check className="h-4 w-4 text-primary ml-2" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
