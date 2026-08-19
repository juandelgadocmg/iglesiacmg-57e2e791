import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ACTIVIDAD_10_DATA } from "../neumatologiaData";
import { Heart, Sparkles, Send, CheckCircle2 } from "lucide-react";

interface Props {
  respuestasPrevias?: Record<string, string>;
  onGuardarRespuesta: (idPregunta: string, texto: string) => void;
  onIrAlDesafio: () => void;
}

export const Actividad10Aplicacion: React.FC<Props> = ({
  respuestasPrevias = {},
  onGuardarRespuesta,
  onIrAlDesafio,
}) => {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(respuestasPrevias);

  const handleChange = (id: string, val: string) => {
    const next = { ...respuestas, [id]: val };
    setRespuestas(next);
    onGuardarRespuesta(id, val);
  };

  const respondidasCount = Object.values(respuestas).filter((t) => t.trim().length > 5).length;
  const totalPreguntas = ACTIVIDAD_10_DATA.preguntas.length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-500 text-white font-bold">Actividad 10</Badge>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Aplicación Personal & Reflexión
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ACTIVIDAD_10_DATA.titulo}</h2>
        <p className="text-sm text-muted-foreground">{ACTIVIDAD_10_DATA.subtitulo}</p>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex gap-3 text-purple-700 dark:text-purple-300">
        <Heart className="h-5 w-5 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Esta sección está diseñada para profundizar en tu devoción personal y tu llamado práctico en el cuerpo de Cristo. Tus respuestas serán leídas y valoradas por el profesor en su evaluación pastoral.
        </p>
      </div>

      <div className="space-y-4">
        {ACTIVIDAD_10_DATA.preguntas.map((p) => {
          const val = respuestas[p.id] || "";
          const listo = val.trim().length > 5;

          return (
            <Card key={p.id} className="border bg-card shadow-2xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base font-bold text-foreground leading-relaxed flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500 shrink-0 mt-1" />
                  <span>{p.texto}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={val}
                  onChange={(e) => handleChange(p.id, e.target.value)}
                  placeholder={p.placeholder}
                  className="min-h-[100px] text-xs md:text-sm bg-muted/30 focus:bg-background transition-all"
                />
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span>{val.length} caracteres</span>
                  {listo && (
                    <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Registrado
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4">
        <span className="text-xs text-muted-foreground font-mono">
          Reflexiones completadas: {respondidasCount}/{totalPreguntas}
        </span>
        <Button onClick={onIrAlDesafio} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6">
          Ir al Desafío Final (60s) ⏱️
        </Button>
      </div>
    </div>
  );
};
