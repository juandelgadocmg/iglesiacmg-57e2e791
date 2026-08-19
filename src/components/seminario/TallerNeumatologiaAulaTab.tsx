import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTallerState } from "@/modules/seminario/taller/useTallerState";
import TallerNeumatologiaPage from "@/pages/TallerNeumatologiaPage";
import {
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  BookOpen,
  Trophy,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  materiaNombre?: string;
  materiaCodigo?: string;
  embeddedInCourse?: boolean;
}

export const TallerNeumatologiaAulaTab: React.FC<Props> = ({
  materiaNombre = "Neumatología",
  materiaCodigo = "NEU-101",
  embeddedInCourse = true,
}) => {
  const { state, reiniciarTaller } = useTallerState();
  const [openModal, setOpenModal] = useState(false);

  const res = state.resultado;
  const tieneResultado = !!res && (state.estado === "completado" || state.estado === "requiere_revision");

  const getEstadoBadge = () => {
    switch (state.estado) {
      case "completado":
        return <Badge className="bg-emerald-600 text-white font-bold gap-1"><CheckCircle2 className="h-3 w-3" /> Completado</Badge>;
      case "requiere_revision":
        return <Badge className="bg-amber-600 text-white font-bold gap-1"><AlertCircle className="h-3 w-3" /> Pendiente Revisión Profesor</Badge>;
      case "en_progreso":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 font-bold gap-1"><Zap className="h-3 w-3" /> En progreso (Actividad {state.actividadActual}/10)</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground font-semibold">No iniciado</Badge>;
    }
  };

  const getNivelColor = (nivel?: string) => {
    if (!nivel) return "bg-primary text-primary-foreground";
    if (nivel.includes("EXCELENTE")) return "bg-gradient-to-r from-emerald-600 to-teal-600 text-white";
    if (nivel.includes("MUY BUEN")) return "bg-gradient-to-r from-blue-600 to-indigo-600 text-white";
    if (nivel.includes("BUEN")) return "bg-gradient-to-r from-sky-600 to-cyan-600 text-white";
    if (nivel.includes("REFORZAR")) return "bg-gradient-to-r from-amber-600 to-orange-600 text-white";
    return "bg-gradient-to-r from-rose-600 to-red-600 text-white";
  };

  return (
    <div className="space-y-4">
      {/* Banner Principal del Taller en Aula Virtual */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-blue-950/30 via-card to-purple-950/20 shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/15 via-transparent to-transparent pointer-events-none rounded-bl-full" />

        <CardContent className="p-5 md:p-6 space-y-4 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-600 text-white font-bold text-[10px] gap-1">
                  <Sparkles className="h-3 w-3" /> Taller de Evaluación Práctica
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {materiaCodigo} · {materiaNombre}
                </Badge>
              </div>

              <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Taller Final: "El Espíritu en operación"
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                Evaluación académica interactiva de 10 actividades prácticas, discernimiento pastoral y caso integral de crisis eclesial.
              </p>
            </div>

            {/* Score Wheel Instantáneo si ya lo realizó */}
            {tieneResultado && res && (
              <div className="flex flex-col items-center justify-center p-3.5 bg-card/90 border-2 border-primary/40 rounded-2xl shadow-md min-w-[140px] shrink-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Resultado Acomulado
                </span>
                <div className="text-3xl font-black font-mono text-primary py-0.5">
                  {res.puntajeTotal}
                  <span className="text-sm text-muted-foreground font-normal">/100</span>
                </div>
                <Badge className={cn("text-[9px] font-extrabold px-2 py-0.5 border shadow-2xs", getNivelColor(res.nivel))}>
                  {res.nivel}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-primary/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Estado:</span>
              {getEstadoBadge()}
            </div>

            <div className="flex items-center gap-2">
              {state.estado !== "no_iniciado" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reiniciarTaller}
                  className="text-xs text-muted-foreground hover:text-destructive gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reiniciar
                </Button>
              )}

              <Button
                onClick={() => setOpenModal(true)}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-5 shadow-sm"
              >
                {tieneResultado ? (
                  <>
                    <Trophy className="h-4 w-4" /> Ver / Reintentar Taller
                  </>
                ) : state.estado === "en_progreso" ? (
                  <>
                    <Play className="h-4 w-4" /> Continuar Taller (Act. {state.actividadActual})
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Iniciar Taller Interactivo →
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Si tiene resultado, mostrar el desglose de áreas de una vez ahí mismo en el Aula Virtual */}
      {tieneResultado && res && (
        <Card className="border bg-card shadow-sm animate-in fade-in duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-500" />
                <span>Resultado Obtenido en el Aula Virtual ({res.puntajeTotal}/100)</span>
              </span>
              <Badge variant="outline" className="text-[10px]">
                {res.nivel}
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Sub-áreas progreso */}
            <div className="grid md:grid-cols-2 gap-3 text-xs">
              {res.subareas.map((sa) => {
                const pct = Math.round((sa.puntosObtenidos / sa.maxPuntos) * 100);
                return (
                  <div key={sa.id} className="bg-muted/30 p-2.5 rounded-xl border space-y-1">
                    <div className="flex justify-between font-medium">
                      <span>{sa.nombre}</span>
                      <span className="font-mono text-muted-foreground">{sa.puntosObtenidos}/{sa.maxPuntos} pts ({pct}%)</span>
                    </div>
                    <Progress value={pct} className="h-1.5 rounded-full" />
                  </div>
                );
              })}
            </div>

            {/* Fortalezas y Recomendaciones resumidas */}
            <div className="grid md:grid-cols-2 gap-3 text-xs pt-1">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl space-y-1">
                <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Fortalezas destacadas:
                </p>
                <p className="text-muted-foreground leading-relaxed">{res.fortalezas.join(", ")}</p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl space-y-1">
                <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> Recomendaciones:
                </p>
                <p className="text-muted-foreground leading-relaxed">{res.debeReforzar.join(", ")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal / Dialog interactivo desplegable directamente en Aula Virtual */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0 border-none bg-background">
          <div className="p-2 md:p-4">
            <TallerNeumatologiaPage />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
