import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVIDAD_3_DATA } from "../neumatologiaData";
import { CheckCircle2, BookOpen, Layers, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  respuestasPrevias?: Record<string, string>;
  onCompletarPaso: (casoId: string, respuesta: string) => void;
  onSiguiente: () => void;
}

export const Actividad3Clasificacion: React.FC<Props> = ({
  respuestasPrevias = {},
  onCompletarPaso,
  onSiguiente,
}) => {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(respuestasPrevias);

  const categorias = ["DON", "MINISTERIO", "OPERACIÓN"];

  const handleSelect = (casoId: string, cat: string) => {
    const next = { ...respuestas, [casoId]: cat };
    setRespuestas(next);
    onCompletarPaso(casoId, cat);
  };

  const respondidos = Object.keys(respuestas).length;
  const todoRespondido = respondidos === ACTIVIDAD_3_DATA.casos.length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">Actividad 3</Badge>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Categorización Teológica
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ACTIVIDAD_3_DATA.titulo}</h2>
        <p className="text-sm text-muted-foreground">{ACTIVIDAD_3_DATA.instrucciones}</p>
      </div>

      <div className="space-y-4">
        {ACTIVIDAD_3_DATA.casos.map((caso, index) => {
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
                    Caso {index + 1} de {ACTIVIDAD_3_DATA.casos.length}
                  </Badge>
                  {seleccion && (
                    <Badge
                      className={cn(
                        "text-[10px]",
                        esCorrecta ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                      )}
                    >
                      {esCorrecta ? "Respuesta Correcta" : "Respuesta Diferente"}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-semibold pt-1 leading-relaxed">
                  "{caso.descripcion}"
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  ¿A cuál corresponde principalmente?
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {categorias.map((cat) => {
                    const isSel = seleccion === cat;
                    const isCorrectCat = cat === caso.respuestaCorrecta;

                    return (
                      <button
                        key={cat}
                        onClick={() => handleSelect(caso.id, cat)}
                        className={cn(
                          "p-3 rounded-xl font-bold text-xs transition-all border flex flex-col items-center justify-center gap-1",
                          isSel
                            ? isCorrectCat
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-105"
                              : "bg-amber-600 text-white border-amber-600 shadow-md scale-105"
                            : seleccion && isCorrectCat
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50"
                            : "bg-muted/40 hover:bg-muted text-foreground border-transparent hover:border-border"
                        )}
                      >
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback */}
                {seleccion && (
                  <div className="bg-card border rounded-lg p-3 space-y-1 text-xs animate-in fade-in duration-300">
                    <p className="font-semibold text-primary flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Retroalimentación:
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
