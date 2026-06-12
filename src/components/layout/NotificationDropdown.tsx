import { Bell, CalendarDays, Cake, Church, DollarSign, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const iconMap = {
  calendar: CalendarDays,
  cake: Cake,
  church: Church,
  dollar: DollarSign,
  alert: AlertTriangle,
};

const colorMap = {
  event: "bg-accent/10 text-accent",
  birthday: "bg-warning/10 text-warning",
  service: "bg-info/10 text-info",
  payment: "bg-destructive/10 text-destructive",
  seminario: "bg-destructive/10 text-destructive",
};

const badgeColorMap = colorMap;

function NotificationItem({ notification }: { notification: AppNotification }) {
  const Icon = iconMap[notification.icon];
  const inner = (
    <div className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
      <div className={cn("p-2 rounded-lg shrink-0", colorMap[notification.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{notification.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{notification.description}</p>
      </div>
      {notification.daysLeft === 0 && (
        <span className="text-[10px] font-semibold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full shrink-0">
          HOY
        </span>
      )}
    </div>
  );
  return notification.href ? <Link to={notification.href}>{inner}</Link> : inner;
}

export default function NotificationDropdown() {
  const { notifications, count } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          {count > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-accent text-accent-foreground border-0">
              {count > 9 ? "9+" : count}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
          <p className="text-xs text-muted-foreground">{count} alerta{count !== 1 ? "s" : ""} activa{count !== 1 ? "s" : ""}</p>
        </div>
        <ScrollArea className="max-h-[360px]">
          {notifications.length > 0 ? (
            <div className="p-2 space-y-1">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sin notificaciones</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
