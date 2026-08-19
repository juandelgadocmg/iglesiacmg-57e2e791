import React from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TallerHeaderProps {
  actividadActual: number;
  totalActividades?: number; // 10
  estado: string;
  onIrAActividad: (num: number) => void;
  onReiniciar: () => void;
  isStaff?: boolean;
  modoProfesor?: boolean;
  onToggleModoProfesor?: () => void;
}

export const TallerHeader: React.FC<TallerHeaderProps> = ({
  actividadActual,
  totalActividades = 10,
  estado,
  onIrAActividad,
  onReiniciar,
  isStaff = false,
  modoProfesor = false,
  onToggleModoProfesor,
}) => {
  // Calculamos porcentaje limitado de 1 a 10 actividades (11 y 12 son desafío y resultado)
  const actLimitada = Math.min(totalActividades, Math.max(1, actividadActual));
  const porcentaje = Math.round((actLimitada / totalActividades) * 100);

  // Barra ASCII decorativa tipo prompt
  const numBloques = Math.round((porcentaje / 100) * 12);
  const asciiBar = "█".repeat(numBloques) + "░".repeat(12 - numBloques);

  return (
    <div className="space-y-4 border-b pb-4 mb-6">
      {/* Top Bar Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/30 border border-primary/20 p-4 rounded-xl shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Seminario Bíblico CMG
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Neumatología
              </Badge>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">
              Taller Final: "El Espíritu en operación"
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStaff && onToggleModoProfesor && (
            <Button
              variant={modoProfesor ? "default" : "outline"}
              size="sm"
              onClick={onToggleModoProfesor}
              className="text-xs gap-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              {modoProfesor ? "Vista Estudiante" : "Panel del Profesor"}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onReiniciar}
            className="text-xs text-muted-foreground hover:text-destructive gap-1"
            title="Reiniciar taller"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Reiniciar</span>
          </Button>
        </div>
      </div>

      {!modoProfesor && (
        <div className="space-y-2">
          {/* Progress Bar Label */}
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                Actividad {actLimitada} de {totalActividades}
              </span>
              <span className="font-mono text-muted-foreground text-[11px] hidden sm:inline">
                {asciiBar}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono">{porcentaje}%</span>
              <Badge
                variant={estado === "completado" ? "default" : "secondary"}
                className="text-[10px] gap-1"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span>Autoguardado</span>
              </Badge>
            </div>
          </div>

          <Progress value={porcentaje} className="h-2.5 rounded-full" />

          {/* Stepper Buttons (1 to 10 + Desafío) */}
          <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-1 scrollbar-none">
            {Array.from({ length: totalActividades }).map((_, i) => {
              const num = i + 1;
              const isCurrent = actividadActual === num;
              const isPassed = actividadActual > num;

              return (
                <button
                  key={num}
                  onClick={() => onIrAActividad(num)}
                  className={cn(
                    "flex-1 min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center border",
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                      : isPassed
                      ? "bg-primary/15 text-foreground border-primary/30 hover:bg-primary/25"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  )}
                  title={`Ir a Actividad ${num}`}
                >
                  {num}
                </button>
              );
            })}

            <button
              onClick={() => onIrAActividad(11)}
              className={cn(
                "px-3 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center border gap-1 whitespace-nowrap",
                actividadActual === 11
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
              )}
            >
              Desafío Final
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
