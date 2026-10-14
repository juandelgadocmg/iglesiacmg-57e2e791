import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVIDAD_6_DATA } from "../neumatologiaData";
import { Sparkles, CheckCircle2, BookOpen, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  respuestasPrevias?: Record<string, string>;
  onCompletarPaso: (casoId: string, respuesta: string) => void;
  onSiguiente: () => void;
}

export const Actividad6NueveDones: React.FC<Props> = ({
  respuestasPrevias = {},
  onCompletarPaso,
  onSiguiente,
}) => {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(respuestasPrevias);

  const handleSelect = (casoId: string, don: string) => {
    const next = { ...respuestas, [casoId]: don };
    setRespuestas(next);
    onCompletarPaso(casoId, don);
  };

  const respondidos = Object.keys(respuestas).length;
  const todoRespondido = respondidos === ACTIVIDAD_6_DATA.casos.length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">Actividad 6</Badge>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Dones del Espíritu Santo
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ACTIVIDAD_6_DATA.titulo}</h2>
        <p className="text-sm text-muted-foreground">
          Identifica el Don Espiritual específico (1 Corintios 12:8-10) que opera en cada situación práctica.
        </p>
      </div>

      <div className="space-y-4">
        {ACTIVIDAD_6_DATA.casos.map((caso, index) => {
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
                  <Badge variant="outline" className="text-[10px] font-mono">
                    CASO {String.fromCharCode(65 + index)} ({index + 1} de 9)
                  </Badge>
                  {seleccion && (
                    <Badge
                      className={cn(
                        "text-[10px]",
                        esCorrecta ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                      )}
                    >
                      {esCorrecta ? "Don Correcto" : "Don Distinto"}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-semibold pt-1 leading-relaxed">
                  "{caso.descripcion}"
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Gift className="h-3.5 w-3.5 text-primary" />
                  ¿Qué don está operando principalmente?
                </p>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {ACTIVIDAD_6_DATA.donesDisponibles.map((don) => {
                    const isSel = seleccion === don;
                    const isCorrect = don === caso.respuestaCorrecta;

                    return (
                      <button
                        key={don}
                        onClick={() => handleSelect(caso.id, don)}
                        className={cn(
                          "p-2.5 rounded-lg text-xs font-medium text-left transition-all border flex items-center justify-between",
                          isSel
                            ? isCorrect
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-amber-600 text-white border-amber-600 shadow-sm"
                            : seleccion && isCorrect
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 font-bold"
                            : "bg-muted/40 hover:bg-muted text-foreground border-transparent hover:border-border"
                        )}
                      >
                        <span>{don}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback */}
                {seleccion && (
                  <div className="bg-card border rounded-lg p-3 space-y-1 text-xs animate-in fade-in duration-300">
                    <p className="font-semibold text-primary flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Respuesta oficial: {caso.respuestaCorrecta}
                    </p>
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
