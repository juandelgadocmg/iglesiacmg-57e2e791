import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVIDAD_1_DATA } from "../neumatologiaData";
import { ArrowDown, CheckCircle2, Sparkles, BookOpen, Layers, Info, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onCompletar: (respuestas: Record<string, any>) => void;
  onSiguiente: () => void;
  completadoPrevio?: boolean;
}

export const Actividad1Conectando: React.FC<Props> = ({
  onCompletar,
  onSiguiente,
  completadoPrevio = false,
}) => {
  // Estado de selecciones para las 3 tarjetas iniciales
  const [seleccionesTarjetas, setSeleccionesTarjetas] = useState<Record<string, string>>({});
  // Estado para el caso integrador final
  const [respuestasIntegrador, setRespuestasIntegrador] = useState<Record<string, string>>({});

  const handleSelectTarjeta = (tarjetaId: string, opcionId: string) => {
    setSeleccionesTarjetas((prev) => ({ ...prev, [tarjetaId]: opcionId }));
  };

  const handleSelectIntegrador = (preguntaId: string, opcionId: string) => {
    const next = { ...respuestasIntegrador, [preguntaId]: opcionId };
    setRespuestasIntegrador(next);

    const totalIntegrador = ACTIVIDAD_1_DATA.casoIntegrador.preguntas.length;
    if (Object.keys(next).length === totalIntegrador) {
      onCompletar({ act1_done: true, seleccionesTarjetas, respuestasIntegrador: next });
    }
  };

  const respondidasTarjetasCount = Object.keys(seleccionesTarjetas).length;
  const todasTarjetasRespondidas = respondidasTarjetasCount === 3 || completadoPrevio;

  const totalIntegrador = ACTIVIDAD_1_DATA.casoIntegrador.preguntas.length;
  const integradorRespondidoCount = Object.keys(respuestasIntegrador).length;
  const todoCompletado =
    (todasTarjetasRespondidas && integradorRespondidoCount === totalIntegrador) || completadoPrevio;

  return (
    <div className="space-y-8">
      {/* Header & Subtítulos de Actividad */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">Actividad 1</Badge>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Fundamentos Neumatológicos
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ACTIVIDAD_1_DATA.titulo}</h2>
        <p className="text-sm text-muted-foreground">{ACTIVIDAD_1_DATA.subtitulo}</p>
        <p className="text-xs text-muted-foreground/80">{ACTIVIDAD_1_DATA.instrucciones}</p>
      </div>

      {/* PARTE 1: LAS 3 TARJETAS DIFERENCIADAS (DONES, MINISTERIOS, OPERACIONES) */}
      <div className="grid md:grid-cols-3 gap-4">
        {ACTIVIDAD_1_DATA.tarjetas.map((t) => {
          const seleccion = seleccionesTarjetas[t.id];
          const revelado = !!seleccion;
          const esCorrecta = seleccion === t.respuestaCorrectaId;

          return (
            <Card
              key={t.id}
              className={cn(
                "transition-all duration-300 border-2 relative overflow-hidden flex flex-col justify-between",
                revelado
                  ? esCorrecta
                    ? "border-emerald-500/60 bg-emerald-500/5 shadow-md"
                    : "border-amber-500/60 bg-amber-500/5 shadow-md"
                  : "border-border hover:border-primary/40 bg-card"
              )}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent pointer-events-none rounded-bl-full" />

              <CardHeader className="pb-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[11px] font-bold tracking-wide">
                    {t.concepto}
                  </Badge>
                  <span className="text-[10px] font-mono text-primary font-semibold">
                    {t.subtituloConcepto}
                  </span>
                </div>
                <CardTitle className="text-sm text-foreground font-semibold leading-snug">
                  {t.pregunta}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {t.opciones.map((op) => {
                    const isSel = seleccion === op.id;
                    const isCorrectOp = op.id === t.respuestaCorrectaId;

                    return (
                      <button
                        key={op.id}
                        onClick={() => handleSelectTarjeta(t.id, op.id)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg text-xs font-medium transition-all border flex items-start gap-2 leading-relaxed",
                          isSel
                            ? isCorrectOp
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-amber-600 text-white border-amber-600 shadow-sm"
                            : revelado && isCorrectOp
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 font-semibold"
                            : "bg-muted/40 hover:bg-muted text-foreground border-transparent hover:border-border"
                        )}
                      >
                        <span className="font-bold shrink-0">{op.id}.</span>
                        <span>{op.texto.substring(3)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Retroalimentación Bíblica por Tarjeta */}
                {revelado && (
                  <div className="bg-card border rounded-lg p-3 space-y-1 text-xs animate-in fade-in duration-300">
                    <div className="flex items-center gap-1.5 font-bold text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Explicación Doctrinal</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{t.retroalimentacion}</p>
                    <p className="text-[10px] text-primary/80 font-mono flex items-center gap-1 pt-0.5">
                      <BookOpen className="h-3 w-3" />
                      {t.referenciaBiblica}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* PARTE 2: AHORA CONECTA LOS TRES CONCEPTOS (Flujo Visual Central) */}
      {todasTarjetasRespondidas && (
        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gradient-to-br from-card via-card to-primary/5 p-6 rounded-2xl border border-primary/30 shadow-lg space-y-5">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg">AHORA CONECTA LOS TRES CONCEPTOS</h3>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-3 py-2 overflow-x-auto">
              {ACTIVIDAD_1_DATA.flujoTeologico.map((item, index) => {
                const isLast = index === ACTIVIDAD_1_DATA.flujoTeologico.length - 1;
                return (
                  <React.Fragment key={item.concepto}>
                    <div
                      className={cn(
                        "px-4 py-3.5 rounded-2xl font-extrabold text-xs md:text-sm text-center shadow-sm border transition-all flex flex-col items-center justify-center gap-0.5",
                        isLast
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 scale-105 shadow-emerald-950/20"
                          : index === 0
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500"
                          : "bg-card text-foreground border-primary/30"
                      )}
                    >
                      <span className="uppercase tracking-wider">{item.concepto}</span>
                      {item.pregunta && (
                        <span className="text-[10px] opacity-90 font-normal italic">
                          {item.pregunta}
                        </span>
                      )}
                    </div>

                    {!isLast && (
                      <div className="text-primary font-bold">
                        <span className="hidden md:inline text-xl">↓</span>
                        <span className="md:hidden text-xl">↓</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* PARTE 3: CASO INTEGRADOR ÚNICO DE LA PÁGINA */}
          <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 space-y-5 shadow-md">
            <div className="space-y-2">
              <Badge className="bg-amber-600 text-white font-bold">Caso Integrador Final</Badge>
              <h3 className="text-lg font-bold text-foreground">
                Aplica la conexión en una situación eclesial real:
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-xl border leading-relaxed">
                "{ACTIVIDAD_1_DATA.casoIntegrador.historia}"
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {ACTIVIDAD_1_DATA.casoIntegrador.preguntas.map((preg) => {
                const sel = respuestasIntegrador[preg.id];
                const esCorrecta = sel === preg.respuestaCorrectaId;

                return (
                  <div key={preg.id} className="space-y-2 bg-muted/20 p-3.5 rounded-xl border">
                    <Badge variant="outline" className="text-[10px] font-extrabold uppercase">
                      {preg.etiqueta}
                    </Badge>

                    <div className="space-y-1.5 pt-1">
                      {preg.opciones.map((op) => {
                        const isSel = sel === op.id;
                        const isCorrectOp = op.id === preg.respuestaCorrectaId;

                        return (
                          <button
                            key={op.id}
                            onClick={() => handleSelectIntegrador(preg.id, op.id)}
                            className={cn(
                              "w-full text-left p-2.5 rounded-lg text-xs font-medium transition-all border flex items-center justify-between",
                              isSel
                                ? isCorrectOp
                                  ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm"
                                  : "bg-amber-600 text-white border-amber-600 font-bold shadow-sm"
                                : sel && isCorrectOp
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 font-bold"
                                : "bg-card hover:bg-muted text-foreground border-transparent hover:border-border"
                            )}
                          >
                            <span>{op.texto}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FRASE REVELADORA Y CONCLUSIÓN BÍBLICA */}
            {todoCompletado && (
              <div className="space-y-4 pt-4 animate-in fade-in duration-500">
                <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950 text-white p-6 rounded-2xl border border-primary/40 text-center space-y-3 shadow-xl">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                    Conclusión Neumatológica Suprema
                  </p>
                  <div className="space-y-1 text-xl md:text-2xl font-black tracking-tight font-mono text-primary-foreground">
                    {ACTIVIDAD_1_DATA.fraseFinal.map((frase) => (
                      <p key={frase}>{frase}</p>
                    ))}
                  </div>
                  <div className="pt-2">
                    <Badge variant="outline" className="text-xs text-amber-300 border-amber-400 font-mono px-3 py-1">
                      📖 {ACTIVIDAD_1_DATA.referenciaFinal}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={onSiguiente} className="gap-2 px-8 font-bold bg-primary text-primary-foreground">
                    Siguiente Actividad →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
