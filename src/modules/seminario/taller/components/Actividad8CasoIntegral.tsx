import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVIDAD_8_DATA } from "../neumatologiaData";
import { AlertCircle, CheckCircle2, Sparkles, BookOpen, ChevronRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  respuestasPrevias?: Record<string, string>;
  onCompletarPaso: (pasoKey: string, opcionId: string) => void;
  onSiguiente: () => void;
}

export const Actividad8CasoIntegral: React.FC<Props> = ({
  respuestasPrevias = {},
  onCompletarPaso,
  onSiguiente,
}) => {
  const [pasoActual, setPasoActual] = useState(1);
  const [respuestas, setRespuestas] = useState<Record<string, string>>(respuestasPrevias);
  const [mostrarResultadoFinal, setMostrarResultadoFinal] = useState(false);

  const handleSeleccionarOpcion = (pasoNumero: number, opcionId: string) => {
    const key = `a8_paso_${pasoNumero}`;
    const next = { ...respuestas, [key]: opcionId };
    setRespuestas(next);
    onCompletarPaso(key, opcionId);
  };

  const pasoObj = ACTIVIDAD_8_DATA.pasos.find((p) => p.numero === pasoActual);
  const keyPaso = `a8_paso_${pasoActual}`;
  const seleccionActual = respuestas[keyPaso];

  const totalPasos = ACTIVIDAD_8_DATA.pasos.length;
  const respondidos = Object.keys(respuestas).filter((k) => k.startsWith("a8_paso_")).length;
  const todoRespondido = respondidos === totalPasos;

  const avanzarPaso = () => {
    if (pasoActual < totalPasos) {
      setPasoActual(pasoActual + 1);
    } else {
      setMostrarResultadoFinal(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500 text-white font-bold">Actividad 8 · Caso Integral</Badge>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Simulación Pastoral
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ACTIVIDAD_8_DATA.titulo}</h2>
      </div>

      {/* Narrativa del Caso */}
      <div className="bg-gradient-to-br from-amber-950/20 via-card to-card border border-amber-500/30 rounded-2xl p-5 space-y-3 shadow-md">
        <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
          <AlertCircle className="h-5 w-5" />
          <h3>Contexto de la Iglesia</h3>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed italic bg-card/60 p-4 rounded-xl border border-amber-500/10">
          "{ACTIVIDAD_8_DATA.narrativa}"
        </p>
      </div>

      {!mostrarResultadoFinal && pasoObj && (
        <Card className="border-2 border-primary/30 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[11px] font-bold">
                Decisión {pasoObj.numero} de {totalPasos}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                Paso {pasoObj.numero}/{totalPasos}
              </span>
            </div>
            <CardTitle className="text-base text-foreground font-bold pt-2">
              DECISIÓN {pasoObj.numero}: {pasoObj.pregunta}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              {pasoObj.opciones.map((op) => {
                const isSel = seleccionActual === op.id;
                const isCorrect = op.id === pasoObj.respuestaCorrectaId;

                return (
                  <button
                    key={op.id}
                    onClick={() => handleSeleccionarOpcion(pasoObj.numero, op.id)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl text-xs md:text-sm font-medium transition-all flex items-center justify-between border",
                      isSel
                        ? isCorrect
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                          : "bg-amber-600 text-white border-amber-600 shadow-md"
                        : "bg-muted/40 hover:bg-muted text-foreground border-transparent hover:border-border"
                    )}
                  >
                    <span className="pr-2">{op.texto}</span>
                    {isSel && (
                      <span className="text-[10px] font-bold shrink-0 bg-white/20 px-2 py-0.5 rounded">
                        Seleccionado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {seleccionActual && (
              <div className="bg-card border rounded-xl p-4 space-y-2 text-xs animate-in fade-in duration-300">
                <div className="flex items-center gap-2 font-bold text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Análisis Bíblico Pastoral</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{pasoObj.explicacion}</p>
                <p className="text-[10px] text-primary/80 font-mono flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {pasoObj.referenciaBiblica}
                </p>
              </div>
            )}

            {seleccionActual && (
              <div className="flex justify-end pt-2">
                <Button onClick={avanzarPaso} className="gap-2">
                  {pasoActual < totalPasos ? (
                    <>
                      Siguiente Decisión <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>Ver Resultado de tus Decisiones →</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pantalla Final de Resultado de Decisión */}
      {(mostrarResultadoFinal || (todoRespondido && pasoActual === totalPasos)) && (
        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-gradient-to-br from-emerald-950/30 via-card to-card border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-xl text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <Badge className="bg-emerald-500 text-white">Evaluación Final de Crisis</Badge>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">
                  RESULTADO DE TU DECISIÓN PASTORAL
                </h3>
                <p className="text-xs text-muted-foreground">
                  Has completado la toma de decisiones para ordenar la congregación en crisis.
                </p>
              </div>
            </div>

            <div className="border-t border-emerald-500/20 pt-4 space-y-3 text-xs">
              <p className="font-bold text-emerald-400">Impacto y Consecuencias Eclesiales:</p>
              <div className="grid md:grid-cols-2 gap-3 text-left">
                <div className="bg-card p-3 rounded-xl border space-y-1">
                  <p className="font-bold text-foreground">🟢 Salud Doctrinal y Espiritual</p>
                  <p className="text-muted-foreground">
                    Al discernir las manifestaciones y unir los dones al carácter cristiano, la iglesia queda protegida contra la falsificación y el orgullo carnal.
                  </p>
                </div>
                <div className="bg-card p-3 rounded-xl border space-y-1">
                  <p className="font-bold text-foreground">🟢 Orden Ministerial y Estructura</p>
                  <p className="text-muted-foreground">
                    Asignando a los Ancianos el cuidado de las almas, los Diáconos para lo práctico, las Ayudas como soporte y los Gobiernos en la coordinación, la iglesia fluye en paz.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onSiguiente} className="gap-2 px-6">
              Siguiente Actividad →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
