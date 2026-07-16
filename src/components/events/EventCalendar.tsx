import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  color?: string | null;
  tipo?: string | null;
  estado?: string;
}

interface Props {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onNewEvent?: () => void;
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function EventCalendar({ events, onEventClick, onNewEvent }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"mes" | "semana" | "dia">("mes");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter(e => {
      const start = e.fecha_inicio;
      const end = e.fecha_fin || e.fecha_inicio;
      return dateStr >= start && dateStr <= end;
    });
  };

  const today = new Date();
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 sm:p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prev} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={next} aria-label="Siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>hoy</Button>
          <h2 className="text-base sm:text-lg font-bold text-foreground sm:hidden ml-1">
            {MONTHS[month].slice(0, 3)} {year}
          </h2>
        </div>

        <h2 className="hidden sm:block text-lg font-bold text-foreground">
          {MONTHS[month]} {year}
        </h2>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {(["mes", "semana", "dia"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors",
                view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-2">
        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {calendarDays.map((day, i) => {
            const dayEvents = getEventsForDate(day.date);
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[60px] sm:min-h-[90px] bg-card p-1 sm:p-1.5 transition-colors hover:bg-muted/50 cursor-pointer",
                  !day.isCurrentMonth && "bg-muted/30"
                )}
                onClick={() => {
                  if (dayEvents.length === 0 && onNewEvent) onNewEvent();
                }}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full",
                    isToday(day.date) && "bg-primary text-primary-foreground",
                    !day.isCurrentMonth && "text-muted-foreground/50"
                  )}
                >
                  {day.date.getDate()}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 2).map(evt => (
                    <div
                      key={evt.id}
                      onClick={e => { e.stopPropagation(); onEventClick(evt); }}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor: (evt.color || "#3b82f6") + "22",
                        color: evt.color || "#3b82f6",
                        borderLeft: `2px solid ${evt.color || "#3b82f6"}`,
                      }}
                    >
                      {evt.nombre}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 2} más</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
