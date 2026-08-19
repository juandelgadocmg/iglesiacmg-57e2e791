import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVIDAD_2_DATA } from "../neumatologiaData";
import { CheckCircle2, XCircle, Info, BookOpen, Sparkles, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  respuestasPrevias?: Record<string, string>;
  onCompletarPaso: (casoId: string, respuesta: string) => void;
  onSiguiente: () => void;
}

export const Actividad2SieteEspiritus: React.FC<Props> = ({
  respuestasPrevias = {},
  onCompletarPaso,
  onSiguiente,
}) => {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(respuestasPrevias);
  const [mostrandoRespuestas, setMostrandoRespuestas] = useState<Record<string, boolean>>({});

  const handleResponder = (casoId: string, opcion: string) => {
    const next = { ...respuestas, [casoId]: opcion };
    setRespuestas(next);
    setMostrandoRespuestas((prev) => ({ ...prev, [casoId]: true }));
    onCompletarPaso(casoId, opcion);
  };

  const totalCasos = ACTIVIDAD_2_DATA.casos.length;
  const respondidos = Object.keys(respuestas).length;
  const todoRespondido = respondidos === totalCasos;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">Actividad 2</Badge>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Plenitud Neumatológica
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ACTIVIDAD_2_DATA.titulo}</h2>
      </div>

      {/* Aclaración Doctrinal Importante */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 text-amber-600 dark:text-amber-400">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-amber-700 dark:text-amber-300">
            Aclaración teológica fundamental
          </p>
          <p className="leading-relaxed">{ACTIVIDAD_2_DATA.aclaracionTeologica}</p>
          <p className="font-mono text-[10px] pt-1">📖 Referencia: Isaías 11:2 / Apocalipsis 1:4</p>
        </div>
      </div>

      {/* 7 Expresiones Grid */}
      <div className="bg-card border rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Las 7 Expresiones de Isaías 11:2:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVIDAD_2_DATA.expresiones.map((exp, idx) => (
            <Badge
              key={exp}
              variant="secondary"
              className="text-xs py-1 px-2.5 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 font-medium"
            >
              {idx + 1}. {exp}
            </Badge>
          ))}
        </div>
      </div>

      {/* Casos Prácticos */}
      <div className="space-y-4">
        {ACTIVIDAD_2_DATA.casos.map((caso, index) => {
          const seleccion = respuestas[caso.id];
          const revelado = mostrandoRespuestas[caso.id] || !!seleccion;
          const esCorrecta = seleccion === caso.respuestaCorrecta;

          return (
            <Card
              key={caso.id}
              className={cn(
                "transition-all border-2",
                revelado
                  ? esCorrecta
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-amber-500/50 bg-amber-500/5"
                  : "border-border"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">
                    Situación {index + 1} de {totalCasos}
                  </Badge>
                  {revelado && (
                    <Badge
                      className={cn(
                        "text-[10px] gap-1",
                        esCorrecta
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-600 text-white"
                      )}
                    >
                      {esCorrecta ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Correcto
                        </>
                      ) : (
                        <>
                          <Info className="h-3 w-3" /> Revisión doctrinal
                        </>
                      )}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-semibold pt-1 leading-relaxed">
                  "{caso.descripcion}"
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  ¿Cuál expresión del Espíritu corresponde principalmente?
                </p>

                <div className="grid sm:grid-cols-2 gap-2">
                  {caso.opciones.map((op) => {
                    const isSelected = seleccion === op;
                    const isCorrectOp = op === caso.respuestaCorrecta;

                    return (
                      <button
                        key={op}
                        disabled={revelado}
                        onClick={() => handleResponder(caso.id, op)}
                        className={cn(
                          "p-2.5 rounded-lg text-xs font-medium text-left transition-all border flex items-center justify-between",
                          isSelected
                            ? isCorrectOp
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-amber-600 text-white border-amber-600 shadow-sm"
                            : revelado && isCorrectOp
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 font-bold"
                            : "bg-muted/40 hover:bg-muted text-foreground border-transparent hover:border-border"
                        )}
                      >
                        <span>{op}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold">Tu elección</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback ¿POR QUÉ? */}
                {revelado && (
                  <div className="bg-card border rounded-lg p-3 space-y-1.5 text-xs animate-in fade-in duration-300">
                    <p className="font-bold text-primary flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5" />
                      ¿POR QUÉ?
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
