import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVIDAD_5_DATA } from "../neumatologiaData";
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  respuestasPrevias?: Record<string, string>;
  onCompletarPaso: (casoId: string, respuesta: string) => void;
  onSiguiente: () => void;
}

export const Actividad5Discernimiento: React.FC<Props> = ({
  respuestasPrevias = {},
  onCompletarPaso,
  onSiguiente,
}) => {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(respuestasPrevias);

  const opciones = [
    { id: "🟢 ACEPTARSE", label: "🟢 ACEPTARSE", color: "border-emerald-500 bg-emerald-500/10 text-emerald-600" },
    { id: "🟡 DISCERNIRSE / JUZGARSE", label: "🟡 DISCERNIRSE", color: "border-amber-500 bg-amber-500/10 text-amber-600" },
    { id: "🔴 RECHAZARSE", label: "🔴 RECHAZARSE", color: "border-rose-500 bg-rose-500/10 text-rose-600" },
  ];

  const handleSelect = (casoId: string, opId: string) => {
    const next = { ...respuestas, [casoId]: opId };
    setRespuestas(next);
    onCompletarPaso(casoId, opId);
  };

  const respondidos = Object.keys(respuestas).length;
  const todoRespondido = respondidos === ACTIVIDAD_5_DATA.casos.length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">Actividad 5</Badge>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Matriz de Discernimiento
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ACTIVIDAD_5_DATA.titulo}</h2>
        <p className="text-sm text-muted-foreground">
          Aplica los 5 Filtros del Discernimiento Espiritual antes de dictaminar la acción pastoral.
        </p>
      </div>

      {/* Los 5 Filtros Visuales */}
      <div className="bg-gradient-to-br from-card via-card to-primary/5 border rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-primary font-bold text-sm">
          <ShieldCheck className="h-5 w-5" />
          <h3>Los 5 Filtros Bíblicos de Evaluación</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {ACTIVIDAD_5_DATA.filtros.map((f) => (
            <div
              key={f.numero}
              className="bg-card border border-primary/20 rounded-xl p-3 space-y-1 hover:border-primary/50 transition-all shadow-2xs"
            >
              <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 w-fit block">
                {f.numero}
              </span>
              <p className="font-bold text-xs text-foreground">{f.nombre}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{f.pregunta}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Casos Prácticos */}
      <div className="space-y-4">
        {ACTIVIDAD_5_DATA.casos.map((caso, index) => {
          const seleccion = respuestas[caso.id];
          const esCorrecta = seleccion === caso.respuestaCorrecta;

          return (
            <Card
              key={caso.id}
              className={cn(
                "transition-all border-2",
                seleccion
                  ? esCorrecta
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-amber-500/50 bg-amber-500/5"
                  : "border-border"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">
                    Caso {index + 1} de {ACTIVIDAD_5_DATA.casos.length}
                  </Badge>
                  {seleccion && (
                    <Badge
                      className={cn(
                        "text-[10px]",
                        esCorrecta ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                      )}
                    >
                      {esCorrecta ? "Decisión Adecuada" : "Revisión Bíblica Requerida"}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-semibold pt-1 leading-relaxed">
                  "{caso.descripcion}"
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  ¿Cuál debe ser la dictaminación de la iglesia?
                </p>

                <div className="grid md:grid-cols-3 gap-2.5">
                  {opciones.map((op) => {
                    const isSel = seleccion === op.id;
                    const isCorrectOp = op.id === caso.respuestaCorrecta;

                    return (
                      <button
                        key={op.id}
                        onClick={() => handleSelect(caso.id, op.id)}
                        className={cn(
                          "p-3 rounded-xl font-bold text-xs transition-all border flex items-center justify-center text-center gap-1.5 shadow-2xs",
                          isSel
                            ? isCorrectOp
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-105"
                              : "bg-amber-600 text-white border-amber-600 shadow-md scale-105"
                            : seleccion && isCorrectOp
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50"
                            : "bg-muted/40 hover:bg-muted text-foreground border-transparent hover:border-border"
                        )}
                      >
                        <span>{op.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback Explicación Bíblica */}
                {seleccion && (
                  <div className="bg-card border rounded-xl p-3.5 space-y-1.5 text-xs animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 font-bold text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Explicación Doctrinal y Bíblica</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{caso.explicacion}</p>
                    {caso.referenciaBiblica && (
                      <p className="text-[10px] text-primary/80 font-mono flex items-center gap-1 pt-0.5">
                        <BookOpen className="h-3 w-3" />
                        {caso.referenciaBiblica}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {todoRespondido && (
        <div className="flex justify-end pt-4">
          <Button onClick={onSiguiente} className="gap-2 px-6">
            Siguiente Actividad →
          </Button>
        </div>
      )}
    </div>
  );
};
