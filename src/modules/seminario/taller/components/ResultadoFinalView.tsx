import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResultadoTaller, NivelResultado } from "../types";
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  BookOpen,
  Award,
  ChevronRight,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  resultado: ResultadoTaller;
  estado: string;
  onReiniciar: () => void;
  onIrAActividad: (num: number) => void;
}

export const ResultadoFinalView: React.FC<Props> = ({
  resultado,
  estado,
  onReiniciar,
  onIrAActividad,
}) => {
  const getNivelColor = (nivel: NivelResultado) => {
    switch (nivel) {
      case "EXCELENTE DOMINIO":
        return "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500";
      case "MUY BUEN DOMINIO":
        return "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500";
      case "BUEN DOMINIO":
        return "bg-gradient-to-r from-sky-600 to-cyan-600 text-white border-sky-500";
      case "DEBE REFORZAR":
        return "bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-500";
      default:
        return "bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-500";
    }
  };

  const esPendienteRevision = estado === "requiere_revision";

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Banner Principal ¡TALLER COMPLETADO! */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-blue-950/40 via-card to-purple-950/30 shadow-2xl overflow-hidden text-center md:text-left relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 via-transparent to-transparent pointer-events-none rounded-bl-full" />

        <CardContent className="p-6 md:p-10 space-y-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 font-bold gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ¡TALLER COMPLETADO!
              </Badge>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                Evaluación Final Neumatología
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Has completado la evaluación práctica "El Espíritu en operación" para el Seminario Bíblico CMG.
              </p>
            </div>

            {/* Score Wheel Widget */}
            <div className="flex flex-col items-center justify-center p-6 bg-card/80 border-2 border-primary/40 rounded-3xl shadow-xl min-w-[180px] backdrop-blur-md">
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Tu resultado
              </span>
              <div className="text-5xl font-black font-mono text-primary py-1">
                {resultado.puntajeTotal}
                <span className="text-xl text-muted-foreground font-normal">/100</span>
              </div>
              <Badge className={cn("text-xs font-extrabold uppercase mt-1 px-3 py-1 border shadow-sm", getNivelColor(resultado.nivel))}>
                {resultado.nivel}
              </Badge>
            </div>
          </div>

          {/* Confirmación de Calificación Inmediata */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-xs text-left">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                Taller completado y calificado inmediatamente — {resultado.puntajeTotal} / 100
              </p>
              <p className="text-muted-foreground">
                Tus respuestas han sido evaluadas y guardadas de una vez. Tu calificación oficial y tu informe de fortalezas están registrados en tu perfil del Aula Virtual.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Fortalezas & A Reforzar */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Tus Fortalezas */}
        <Card className="border-2 border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              <span>Tus fortalezas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resultado.fortalezas.map((f) => (
              <div
                key={f}
                className="bg-card p-2.5 rounded-xl border border-emerald-500/20 text-xs font-semibold text-foreground flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Debes Reforzar */}
        <Card className="border-2 border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <span>Debes reforzar</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resultado.debeReforzar.map((d) => (
              <div
                key={d}
                className="bg-card p-2.5 rounded-xl border border-amber-500/20 text-xs font-semibold text-foreground flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>{d}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Desglose por Sub-áreas */}
      <Card className="border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Desglose Ponderado por Áreas (100 Puntos Totales)</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {resultado.subareas.map((sa) => {
            const pct = Math.round((sa.puntosObtenidos / sa.maxPuntos) * 100);
            return (
              <div key={sa.id} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground">{sa.nombre}</span>
                  <span className="font-mono text-muted-foreground">
                    {sa.puntosObtenidos} / {sa.maxPuntos} pts ({pct}%)
                  </span>
                </div>
                <Progress value={pct} className="h-2 rounded-full" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onReiniciar} className="gap-2 text-xs">
          <RotateCcw className="h-4 w-4" />
          Reiniciar Taller
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => onIrAActividad(1)} className="gap-2 text-xs">
            Revisar Actividades
          </Button>
          <Button onClick={() => window.print()} className="gap-2 text-xs bg-primary text-primary-foreground">
            <Printer className="h-4 w-4" />
            Imprimir Comprobante
          </Button>
        </div>
      </div>
    </div>
  );
};
