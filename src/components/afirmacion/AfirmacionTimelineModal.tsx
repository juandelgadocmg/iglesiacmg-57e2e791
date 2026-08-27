import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CheckCircle2,
  Calendar as CalendarIcon,
  Clock,
  Pencil,
  PhoneCall,
  Sparkles,
  User,
  MessageSquare,
  AlertCircle,
  Phone,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  PersonaAfirmacionRuta,
  PersonaHitoEstado,
} from "@/hooks/useAfirmacionRuta";
import { HitoEditDialog } from "./HitoEditDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: PersonaAfirmacionRuta | null;
  onSaveHito: (payload: {
    personaId: string;
    procesoId?: string;
    hitoNombre: string;
    estado: "Pendiente" | "En curso" | "Finalizado";
    fechaRealizada?: string | null;
    observacion?: string | null;
    codificacionLlamada?: string | null;
    consolidadorNombre?: string | null;
  }) => Promise<void>;
}

export function AfirmacionTimelineModal({
  open,
  onOpenChange,
  persona,
  onSaveHito,
}: Props) {
  const [editingHito, setEditingHito] = useState<PersonaHitoEstado | null>(null);

  if (!persona) return null;

  const handleQuickToggleStatus = async (hito: PersonaHitoEstado, newEstado: "En curso" | "Finalizado") => {
    await onSaveHito({
      personaId: persona.id,
      procesoId: hito.procesoId,
      hitoNombre: hito.hitoDef.nombre,
      estado: newEstado,
      fechaRealizada: newEstado === "Finalizado" ? new Date().toISOString().slice(0, 10) : hito.fechaRealizada,
      observacion: hito.observacion,
      consolidadorNombre: persona.consolidadorNombre,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 border-border/80 shadow-2xl bg-card">
          <DialogHeader className="space-y-1 border-b border-border/60 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/30 shadow-sm shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                    {persona.nombreCompleto.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-2xl font-extrabold tracking-tight">
                    {persona.nombreCompleto}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap mt-0.5">
                    <span>
                      <strong className="text-foreground">Ingreso:</strong>{" "}
                      {persona.fechaIngreso ? format(parseISO(persona.fechaIngreso), "dd/MM/yyyy") : "—"}
                    </span>
                    <span>·</span>
                    <span className="font-semibold text-primary">
                      Día {persona.diasDesdeIngreso} del proceso
                    </span>
                    <span>·</span>
                    <span>
                      <strong className="text-foreground">Consolidador:</strong> {persona.consolidadorNombre}
                    </span>
                  </DialogDescription>
                </div>
              </div>

              {persona.telefono && (
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${persona.telefono}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" /> Llamar
                  </a>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="grid lg:grid-cols-[260px_1fr] gap-6 pt-4 items-start">
            {/* ── LEFT SIDEBAR: PROGRESS STATS ────────────────────────────── */}
            <aside className="space-y-4 lg:sticky lg:top-0">
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-emerald-500/10 p-5 text-center shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Porcentaje Completado
                </p>

                <div className="relative w-28 h-28 mx-auto my-2">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(persona.porcentajeCompletado / 100) * 264} 264`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-extrabold text-foreground">{persona.porcentajeCompletado}%</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Avance</p>
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <p className="text-base font-extrabold text-foreground">
                    {persona.hitosCompletados} DE 16 HITOS
                  </p>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Ruta de Crecimiento Espiritual
                  </p>
                </div>
              </div>

              {/* Status Legend & Info */}
              <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-sm text-xs">
                <p className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Leyenda de Estados
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" /> 🟢 Finalizado
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      Completado
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-3 h-3 rounded-full bg-sky-500" /> 🔵 En curso
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      En proceso
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" /> ⚪ Pendiente
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      Por iniciar
                    </Badge>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <p className="text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Próximo Hito:</strong> {persona.proximoHitoNombre}
                  </p>
                </div>
              </div>
            </aside>

            {/* ── RIGHT TIMELINE: 16 HITOS ROADMAP ────────────────────────── */}
            <div className="relative">
              <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary via-primary/40 to-muted rounded-full pointer-events-none" />

              <div className="space-y-3.5">
                {persona.hitos.map((hito, idx) => {
                  const isDone = hito.estado === "Finalizado";
                  const isDoing = hito.estado === "En curso";
                  const nodeColor = isDone
                    ? "bg-emerald-500 text-white ring-emerald-500/30"
                    : isDoing
                    ? "bg-sky-500 text-white ring-sky-500/30 animate-pulse"
                    : "bg-card text-muted-foreground ring-border";

                  return (
                    <motion.div
                      key={hito.hitoDef.key}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="relative pl-14"
                    >
                      {/* Node Icon */}
                      <div
                        className={cn(
                          "absolute left-3 top-3 w-6 h-6 rounded-full flex items-center justify-center border-2 border-card ring-4 z-10 font-bold text-xs shadow-sm",
                          nodeColor
                        )}
                      >
                        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                      </div>

                      {/* Card Content */}
                      <div
                        className={cn(
                          "rounded-2xl border p-4 transition-all shadow-sm",
                          isDone
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : isDoing
                            ? "border-sky-500/40 bg-sky-500/5 shadow-md"
                            : hito.atrasado
                            ? "border-rose-500/40 bg-rose-500/5"
                            : "border-border/70 bg-card hover:border-primary/40"
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-card border-border font-bold shrink-0"
                              >
                                Hito {hito.hitoDef.index} de 16
                              </Badge>
                              <h4 className="font-bold text-sm text-foreground truncate">
                                {hito.hitoDef.nombre}
                              </h4>
                              {hito.atrasado && (
                                <Badge variant="destructive" className="text-[10px] py-0 font-semibold">
                                  Atrasado
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3 text-primary" /> Prog:{" "}
                                {format(parseISO(hito.fechaProgramada), "dd/MM/yyyy")}
                              </span>

                              {hito.fechaRealizada ? (
                                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" /> Realizado:{" "}
                                  {format(parseISO(hito.fechaRealizada), "dd/MM/yyyy")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/70 italic">Sin fecha realizada</span>
                              )}
                            </div>

                            {/* Call Result badge if applicable */}
                            {hito.resultadoLlamada && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mt-1">
                                <PhoneCall className="h-3 w-3" /> {hito.resultadoLlamada}
                              </div>
                            )}

                            {/* Observations / Notes */}
                            {hito.observacion && (
                              <div className="mt-2 p-2.5 rounded-xl bg-muted/60 border border-border/50 text-xs text-foreground/90 whitespace-pre-wrap">
                                <span className="font-semibold text-primary block mb-0.5">Notas:</span>
                                {hito.observacion}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                            {!isDone && (
                              <Button
                                size="sm"
                                variant={isDoing ? "default" : "secondary"}
                                className="h-8 text-xs font-semibold rounded-xl"
                                onClick={() => handleQuickToggleStatus(hito, isDoing ? "Finalizado" : "En curso")}
                              >
                                {isDoing ? "Finalizar" : "Iniciar"}
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-semibold rounded-xl gap-1.5"
                              onClick={() => setEditingHito(hito)}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Hito Dialog */}
      <HitoEditDialog
        open={!!editingHito}
        onOpenChange={(val) => !val && setEditingHito(null)}
        personaNombre={persona.nombreCompleto}
        personaId={persona.id}
        hito={editingHito}
        onSave={onSaveHito}
      />
    </>
  );
}
