import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ExternalLink, Copy, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  listShares,
  removeShare,
  clearShares,
  subscribeShares,
  type ShareScope,
  type RecentShare,
} from "@/lib/recentShares";
import { cn } from "@/lib/utils";

type Props = {
  scope: ShareScope;
  className?: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
};

/**
 * Quick-access panel with the last shared deep links for the current scope.
 * Users can re-open, copy or remove entries. Persists in localStorage.
 */
export default function RecentSharesPanel({
  scope,
  className,
  size = "sm",
  variant = "outline",
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const items = useMemo<RecentShare[]>(
    () => listShares(scope),
    // tick forces re-read after add/remove/clear
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope, tick, open],
  );

  useEffect(() => subscribeShares(() => setTick((t) => t + 1)), []);

  const openEntry = (s: RecentShare) => {
    try {
      const u = new URL(s.url);
      if (u.origin === window.location.origin) {
        setOpen(false);
        navigate(u.pathname + u.search + u.hash);
      } else {
        window.open(s.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Enlace inválido");
    }
  };

  const copyEntry = async (s: RecentShare) => {
    try {
      await navigator.clipboard.writeText(s.url);
      toast.success("Enlace copiado", { description: s.label });
    } catch {
      window.prompt("Copia el enlace:", s.url);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size={size === "default" ? "default" : "icon"}
          variant={variant}
          className={cn("h-8 w-8", className)}
          aria-label="Historial de enlaces compartidos"
          title="Historial de enlaces compartidos"
        >
          <History className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Enlaces recientes</span>
          {items.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                clearShares(scope);
                toast.success("Historial vaciado");
              }}
            >
              Vaciar
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-muted-foreground">
            <Inbox className="h-6 w-6 opacity-50" />
            <span>Aún no has compartido enlaces desde aquí.</span>
          </div>
        ) : (
          <ScrollArea className="max-h-72">
            <ul className="divide-y">
              {items.map((s) => (
                <li key={s.url} className="p-2 hover:bg-accent/40">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => openEntry(s)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="text-sm font-medium truncate">
                        {s.label || "Vista compartida"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {formatDistanceToNow(new Date(s.ts), { addSuffix: true, locale: es })}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Abrir enlace"
                        onClick={() => openEntry(s)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Copiar enlace"
                        onClick={() => copyEntry(s)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Quitar del historial"
                        onClick={() => removeShare(s.url)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
