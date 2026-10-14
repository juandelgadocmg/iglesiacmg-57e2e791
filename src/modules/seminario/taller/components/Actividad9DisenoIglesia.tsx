import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVIDAD_9_DATA } from "../neumatologiaData";
import { Sparkles, CheckCircle2, Cross, Layers, ShieldCheck, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  completadoPrevio?: boolean;
  onCompletar: () => void;
  onSiguiente: () => void;
}

export const Actividad9DisenoIglesia: React.FC<Props> = ({
  completadoPrevio = false,
  onCompletar,
  onSiguiente,
}) => {
  const [ubicados, setUbicados] = useState<string[]>(
    completadoPrevio ? ACTIVIDAD_9_DATA.elementosParaUbicar.map((e) => e.id) : []
  );

  const toggleElemento = (id: string) => {
    let next: string[];
    if (ubicados.includes(id)) {
      next = ubicados.filter((item) => item !== id);
    } else {
      next = [...ubicados, id];
    }
    setUbicados(next);
    if (next.length === ACTIVIDAD_9_DATA.elementosParaUbicar.length) {
      onCompletar();
    }
  };

  const todoUbicado = ubicados.length === ACTIVIDAD_9_DATA.elementosParaUbicar.length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">Actividad 9</Badge>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Arquitectura Eclesial
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ACTIVIDAD_9_DATA.titulo}</h2>
        <p className="text-sm text-muted-foreground">{ACTIVIDAD_9_DATA.instrucciones}</p>
      </div>

      {/* Visual Canvas Diagram */}
      <div className="relative bg-gradient-to-br from-blue-950/40 via-card to-purple-950/30 border-2 border-primary/30 rounded-3xl p-6 md:p-10 shadow-xl overflow-hidden min-h-[420px] flex flex-col items-center justify-center">
        {/* Subtle Radial Glow background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none" />

        {/* NODO CENTRAL: CRISTO */}
        <div className="relative z-10 my-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-primary to-purple-500 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
            <div className="relative px-8 py-5 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 rounded-full text-white font-extrabold text-lg md:text-xl shadow-2xl flex items-center gap-2 border-2 border-amber-300">
              <Cross className="h-6 w-6 text-amber-200 animate-spin-slow" />
              <span>{ACTIVIDAD_9_DATA.elementoCentral}</span>
            </div>
          </div>
          <p className="text-[10px] text-amber-400 font-mono text-center pt-2 uppercase tracking-widest font-bold">
            Cabeza Suprema del Cuerpo
          </p>
        </div>

        {/* Nodos Satélite Alrededor */}
        <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 z-10 pt-4">
          {ACTIVIDAD_9_DATA.elementosParaUbicar.map((el) => {
            const isConnected = ubicados.includes(el.id);

            return (
              <button
                key={el.id}
                onClick={() => toggleElemento(el.id)}
                className={cn(
                  "p-3 rounded-2xl font-bold text-xs transition-all border flex flex-col items-center justify-center text-center gap-1 shadow-sm relative overflow-hidden group",
                  isConnected
                    ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                    : "bg-card/80 hover:bg-card text-foreground border-primary/20 hover:border-primary/50 opacity-70"
                )}
              >
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground group-hover:text-primary">
                  {el.area}
                </span>
                <span className="leading-tight">{el.nombre}</span>
                {isConnected && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 absolute top-1.5 right-1.5" />
                )}
              </button>
            );
          })}
        </div>

        {!todoUbicado && (
          <p className="text-xs text-muted-foreground pt-6 text-center animate-pulse z-10">
            Haz clic en los 10 elementos para conectarlos armónicamente al centro de Cristo ({ubicados.length}/10)
          </p>
        )}
      </div>

      {/* Explicación Teológica de la Estructura */}
      {todoUbicado && (
        <div className="bg-gradient-to-r from-emerald-950/30 via-card to-card border border-emerald-500/40 rounded-2xl p-6 space-y-3 shadow-lg animate-in fade-in duration-500">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <Sparkles className="h-5 w-5" />
            <h3>Construcción Eclesial Saludable Completada</h3>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            "{ACTIVIDAD_9_DATA.explicacionFinal}"
          </p>
          <div className="flex justify-end pt-2">
            <Button onClick={onSiguiente} className="gap-2 px-6">
              Siguiente Actividad →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
