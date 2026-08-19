import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVIDAD_1_DATA } from "../neumatologiaData";
import { ArrowDown, CheckCircle2, Sparkles, BookOpen, Layers } from "lucide-react";
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
  const [selecciones, setSelecciones] = useState<Record<string, string>>({});
  const [mostrarFlujo, setMostrarFlujo] = useState(completadoPrevio);

  const opcionesRespuestas = [
    { id: "manifiesta", label: "Lo que el Espíritu manifiesta soberanamente" },
    { id: "servimos", label: "La forma en que servimos activamente al cuerpo" },
    { id: "produce", label: "El fruto y obra que Dios produce eficazmente" },
  ];

  const handleSelect = (tarjetaId: string, opcionId: string) => {
    const prev = { ...selecciones, [tarjetaId]: opcionId };
    setSelecciones(prev);
    if (Object.keys(prev).length === 3) {
      setMostrarFlujo(true);
      onCompletar({ act1_done: true, selecciones: prev });
    }
  };

  const todoSeleccionado = Object.keys(selecciones).length === 3 || mostrarFlujo;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">Actividad 1</Badge>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Fundamentos Bíblicos
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ACTIVIDAD_1_DATA.titulo}</h2>
        <p className="text-sm text-muted-foreground">{ACTIVIDAD_1_DATA.instrucciones}</p>
      </div>

      {/* 3 Tarjetas interactiva */}
      <div className="grid md:grid-cols-3 gap-4">
        {ACTIVIDAD_1_DATA.tarjetas.map((t) => {
          const actualSel = selecciones[t.id];
          return (
            <Card
              key={t.id}
              className={cn(
                "transition-all duration-300 border-2 relative overflow-hidden",
                actualSel
                  ? "border-primary/60 bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40 bg-card"
              )}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent pointer-events-none rounded-bl-full" />
              <CardHeader className="pb-3">
                <Badge variant="outline" className="w-fit text-[11px] font-bold tracking-wide mb-1">
                  {t.concepto}
                </Badge>
                <CardTitle className="text-base text-foreground font-semibold">{t.pregunta}</CardTitle>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">{t.descripcion}</p>
              </CardHeader>

              <CardContent className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Selecciona la función:
                </p>
                {opcionesRespuestas.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => handleSelect(t.id, op.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg text-xs font-medium transition-all flex items-start gap-2 border",
                      actualSel === op.id
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-transparent hover:border-border"
                    )}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                        actualSel === op.id
                          ? "border-primary-foreground bg-primary-foreground/20"
                          : "border-muted-foreground"
                      )}
                    >
                      {actualSel === op.id && (
                        <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                    <span>{op.label}</span>
                  </button>
                ))}
                <p className="text-[10px] text-muted-foreground/80 pt-1 flex items-center gap-1 font-mono">
                  <BookOpen className="h-3 w-3" />
                  {t.referenciaBiblica}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Flujo Teológico Interactivo */}
      {todoSeleccionado && (
        <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gradient-to-br from-card via-card to-primary/5 p-6 rounded-2xl border border-primary/30 shadow-lg space-y-5">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-lg">Flujo Divino de la Operación en la Iglesia</h3>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 py-4 overflow-x-auto">
              {ACTIVIDAD_1_DATA.flujoTeologico.map((nodo, index) => {
                const isLast = index === ACTIVIDAD_1_DATA.flujoTeologico.length - 1;
                return (
                  <React.Fragment key={nodo}>
                    <div
                      className={cn(
                        "px-4 py-3 rounded-xl font-bold text-xs md:text-sm text-center shadow-sm border transition-all whitespace-nowrap",
                        isLast
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 scale-105 shadow-emerald-950/20"
                          : index === 0
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500"
                          : "bg-card text-foreground border-primary/20 hover:border-primary/50"
                      )}
                    >
                      {nodo}
                    </div>
                    {!isLast && (
                      <div className="text-primary font-bold animate-bounce md:animate-none">
                        <span className="hidden md:inline text-lg">→</span>
                        <span className="md:hidden text-lg">↓</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span>Retroalimentación Académica y Bíblica</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {ACTIVIDAD_1_DATA.retroalimentacion}
              </p>
              <p className="text-primary font-semibold text-[11px] pt-1">
                📖 Referencia clave: 1 Corintios 12:4-6
              </p>
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
