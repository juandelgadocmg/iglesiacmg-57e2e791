import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVIDAD_4_DATA } from "../neumatologiaData";
import { CheckCircle2, ShieldAlert, BookOpen, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  respuestasPrevias?: Record<string, string>;
  onCompletarPaso: (casoId: string, respuesta: string) => void;
  onSiguiente: () => void;
}

export const Actividad4Falsificacion: React.FC<Props> = ({
  respuestasPrevias = {},
  onCompletarPaso,
  onSiguiente,
}) => {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(respuestasPrevias);

  const opciones = [
    { id: "GENUINO", label: "GENUINO", color: "border-emerald-500 text-emerald-500 hover:bg-emerald-500/10" },
    { id: "DON GENUINO MAL UTILIZADO", label: "GENUINO MAL UTILIZADO", color: "border-amber-500 text-amber-500 hover:bg-amber-500/10" },
    { id: "FALSIFICACIÓN", label: "FALSIFICACIÓN", color: "border-rose-500 text-rose-500 hover:bg-rose-500/10" },
  ];

  const handleSelect = (casoId: string, opId: string) => {
    const next = { ...respuestas, [casoId]: opId };
    setRespuestas(next);
    onCompletarPaso(casoId, opId);
  };

  const respondidos = Object.keys(respuestas).length;
  const todoRespondido = respondidos === ACTIVIDAD_4_DATA.casos.length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">Actividad 4</Badge>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Discernimiento de Autenticidad
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ACTIVIDAD_4_DATA.titulo}</h2>
        <p className="text-sm text-muted-foreground">{ACTIVIDAD_4_DATA.instrucciones}</p>
      </div>

      <div className="space-y-4">
        {ACTIVIDAD_4_DATA.casos.map((caso, index) => {
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
                    Caso {index + 1} de {ACTIVIDAD_4_DATA.casos.length}
                  </Badge>
                  {seleccion && (
                    <Badge
                      className={cn(
                        "text-[10px]",
                        esCorrecta ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                      )}
                    >
                      {esCorrecta ? "Evaluación Correcta" : "Diferente a la Clave"}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-semibold pt-1 leading-relaxed">
                  "{caso.descripcion}"
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Clasifica la situación espiritual:
                </p>

                <div className="grid md:grid-cols-3 gap-2">
                  {opciones.map((op) => {
                    const isSel = seleccion === op.id;
                    const isCorrectOp = op.id === caso.respuestaCorrecta;

                    return (
                      <button
                        key={op.id}
                        onClick={() => handleSelect(caso.id, op.id)}
                        className={cn(
                          "p-3 rounded-xl font-bold text-xs transition-all border flex items-center justify-center text-center gap-1.5",
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

                {/* Feedback */}
                {seleccion && (
                  <div className="bg-card border rounded-lg p-3 space-y-1.5 text-xs animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 font-bold text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Explicación Doctrinal</span>
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
