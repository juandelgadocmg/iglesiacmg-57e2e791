import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CONCEPTOS_60_SEGUNDOS, ConceptoDesafio } from "../neumatologiaData";
import { Desafio60SegundosRespuesta } from "../types";
import { Clock, Dices, Play, Pause, RotateCcw, CheckCircle2, Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  desafioPrevio?: Desafio60SegundosRespuesta;
  onCompletarDesafio: (desafio: Desafio60SegundosRespuesta) => void;
  onVerResultados: () => void;
}

export const Desafio60Segundos: React.FC<Props> = ({
  desafioPrevio,
  onCompletarDesafio,
  onVerResultados,
}) => {
  const [concepto, setConcepto] = useState<ConceptoDesafio>(() => {
    if (desafioPrevio?.conceptoId) {
      return (
        CONCEPTOS_60_SEGUNDOS.find((c) => c.id === desafioPrevio.conceptoId) ||
        CONCEPTOS_60_SEGUNDOS[0]
      );
    }
    const idx = Math.floor(Math.random() * CONCEPTOS_60_SEGUNDOS.length);
    return CONCEPTOS_60_SEGUNDOS[idx];
  });

  const [tiempoRestante, setTiempoRestante] = useState(60);
  const [timerActivo, setTimerActivo] = useState(false);
  const [respuestaTexto, setRespuestaTexto] = useState(desafioPrevio?.respuestaTexto || "");

  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (timerActivo && tiempoRestante > 0) {
      intervalRef.current = setInterval(() => {
        setTiempoRestante((prev) => prev - 1);
      }, 1000);
    } else if (tiempoRestante === 0) {
      setTimerActivo(false);
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerActivo, tiempoRestante]);

  const seleccionarAleatorio = () => {
    const filtrados = CONCEPTOS_60_SEGUNDOS.filter((c) => c.id !== concepto.id);
    const idx = Math.floor(Math.random() * filtrados.length);
    setConcepto(filtrados[idx]);
    setTiempoRestante(60);
    setTimerActivo(false);
  };

  const toggleTimer = () => {
    setTimerActivo(!timerActivo);
  };

  const reiniciarTimer = () => {
    setTimerActivo(false);
    setTiempoRestante(60);
  };

  const handleEnviar = () => {
    const data: Desafio60SegundosRespuesta = {
      conceptoId: concepto.id,
      conceptoNombre: concepto.nombre,
      respuestaTexto,
      duracionSegundos: 60 - tiempoRestante,
      completado: true,
    };
    onCompletarDesafio(data);
    onVerResultados();
  };

  const pct = (tiempoRestante / 60) * 100;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-600 text-white font-bold animate-pulse">
            Desafío Final · ⏱️ 60 Segundos
          </Badge>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Síntesis Oral / Escrita
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">EXPLÍCALO EN 60 SEGUNDOS</h2>
        <p className="text-sm text-muted-foreground">
          Demuestra tu dominio sintético explicando el concepto asignado en un minuto.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Tarjeta de Concepto */}
        <Card className="md:col-span-1 border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-card to-card flex flex-col justify-between shadow-md">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-500">
                Concepto Aleatorio
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={seleccionarAleatorio}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-amber-500"
                title="Girar ruleta"
              >
                <Dices className="h-4 w-4" />
                Girar
              </Button>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                {concepto.nombre}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {concepto.descripcionBreve}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            <div className="bg-card p-3 rounded-xl border space-y-1 text-xs">
              <p className="font-bold text-amber-500">Tu síntesis debe responder:</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>¿Qué es?</li>
                <li>¿Para qué sirve?</li>
                <li>¿Cómo se aplica en la Iglesia?</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Columna Derecha: Temporizador & Entrada de Respuesta */}
        <Card className="md:col-span-2 border-2 border-primary/20 bg-card space-y-4 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <span>Cronómetro de 60 Segundos</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={timerActivo ? "destructive" : "default"}
                  size="sm"
                  onClick={toggleTimer}
                  className="gap-1 text-xs"
                >
                  {timerActivo ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {timerActivo ? "Pausar" : "Iniciar 60s"}
                </Button>
                <Button variant="outline" size="sm" onClick={reiniciarTimer} className="h-8 w-8 p-0">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Reloj Contador Regresivo */}
            <div className="relative bg-gradient-to-r from-muted/60 via-muted to-muted/60 p-4 rounded-2xl flex flex-col items-center justify-center border space-y-1 overflow-hidden">
              <div
                className={cn(
                  "font-mono font-extrabold text-4xl md:text-5xl transition-all",
                  tiempoRestante <= 10
                    ? "text-rose-500 animate-pulse"
                    : tiempoRestante <= 30
                    ? "text-amber-500"
                    : "text-primary"
                )}
              >
                00:{tiempoRestante < 10 ? `0${tiempoRestante}` : tiempoRestante}
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {tiempoRestante === 0 ? "¡Tiempo concluido!" : timerActivo ? "En marcha..." : "Listo para iniciar"}
              </p>

              {/* Progress Bar under timer */}
              <div
                className="absolute bottom-0 left-0 h-1 bg-amber-500 transition-all duration-1000"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Caja de Texto para la Respuesta */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex justify-between">
                <span>Escribe tu respuesta sintetizada:</span>
                <span className="font-mono">{respuestaTexto.length} car.</span>
              </label>
              <Textarea
                value={respuestaTexto}
                onChange={(e) => setRespuestaTexto(e.target.value)}
                placeholder="Explica qué es, para qué sirve y cómo se aplica en la iglesia en tus palabras..."
                className="min-h-[140px] text-xs md:text-sm bg-muted/20 focus:bg-background transition-all"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleEnviar}
                disabled={respuestaTexto.trim().length < 10}
                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-8 shadow-md"
              >
                <Send className="h-4 w-4" />
                Finalizar y Ver Calificación
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
