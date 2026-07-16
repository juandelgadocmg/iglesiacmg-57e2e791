import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock as ClockIcon } from "lucide-react";

/**
 * Timeline semanal de reuniones recurrentes.
 * Filas = sedes. Columnas = días de la semana. Cards ubicadas por dia_reunion + hora.
 */
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const norm = (s: any) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const TONES = [
  "bg-primary/10 border-primary/30 text-primary",
  "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
  "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400",
  "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-400",
  "bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-400",
];

function toneFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

function todayIndex() {
  // JS: 0=Dom … 6=Sáb → adapt to Lun=0…Dom=6
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export default function WeeklyTimeline({
  servicios, onOpen,
}: {
  servicios: any[];
  onOpen: (s: any) => void;
}) {
  const sedes = useMemo(() => {
    const s = new Set<string>();
    (servicios || []).forEach((x) => s.add((x as any).sede || "Principal"));
    return Array.from(s).sort();
  }, [servicios]);

  const bySedeDay = useMemo(() => {
    const map = new Map<string, any[]>();
    (servicios || []).forEach((s) => {
      const sede = (s as any).sede || "Principal";
      const dayIdx = DAYS.findIndex((d) => norm(d) === norm((s as any).dia_reunion || ""));
      if (dayIdx < 0) return;
      const key = `${sede}::${dayIdx}`;
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    });
    // sort within each cell by hora
    for (const [k, arr] of map) {
      arr.sort((a, b) => String(a.hora || "").localeCompare(String(b.hora || "")));
      map.set(k, arr);
    }
    return map;
  }, [servicios]);

  const withoutDay = (servicios || []).filter(
    (s) => !DAYS.some((d) => norm(d) === norm((s as any).dia_reunion || ""))
  );

  const today = todayIndex();

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header days */}
      <div
        className="grid border-b bg-muted/30 text-[11px] uppercase tracking-wider font-semibold"
        style={{ gridTemplateColumns: "140px repeat(7, minmax(0, 1fr))" }}
      >
        <div className="px-3 py-2.5 text-muted-foreground">Sede</div>
        {DAY_SHORT.map((d, i) => (
          <div
            key={d}
            className={cn(
              "px-2 py-2.5 text-center border-l",
              i === today && "text-primary bg-primary/5"
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y">
        {sedes.map((sede) => (
          <div
            key={sede}
            className="grid min-h-[110px]"
            style={{ gridTemplateColumns: "140px repeat(7, minmax(0, 1fr))" }}
          >
            <div className="px-3 py-2 border-r bg-muted/20 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[12.5px] font-medium">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {sede}
              </div>
              <div className="text-[10.5px] text-muted-foreground">
                {DAYS.reduce((acc, _, i) => acc + (bySedeDay.get(`${sede}::${i}`)?.length || 0), 0)} reuniones
              </div>
            </div>
            {DAYS.map((_, i) => {
              const items = bySedeDay.get(`${sede}::${i}`) || [];
              return (
                <div
                  key={i}
                  className={cn(
                    "p-1.5 border-l space-y-1 min-w-0",
                    i === today && "bg-primary/[0.03]"
                  )}
                >
                  {items.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onOpen(s)}
                      className={cn(
                        "w-full text-left rounded-md border px-2 py-1.5 hover:shadow-sm transition-all",
                        toneFor(s.nombre || "")
                      )}
                    >
                      <div className="text-[11.5px] font-semibold truncate leading-tight">
                        {s.nombre}
                      </div>
                      <div className="flex items-center gap-1 text-[10.5px] opacity-80 mt-0.5">
                        <ClockIcon className="h-2.5 w-2.5" />
                        {s.hora || "—"}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
        {sedes.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No hay reuniones registradas.
          </div>
        )}
      </div>

      {withoutDay.length > 0 && (
        <div className="border-t px-3 py-2 bg-muted/20 text-[11.5px] text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>Sin día asignado:</span>
          {withoutDay.map((s) => (
            <button
              key={s.id}
              onClick={() => onOpen(s)}
              className="rounded-full border px-2 py-0.5 hover:bg-background"
            >
              {s.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
