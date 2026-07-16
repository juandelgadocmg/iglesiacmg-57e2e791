import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, UserPlus, X, Loader2 } from "lucide-react";

interface Props {
  selectedIds: string[];
  onClear: () => void;
}

const ROLES: { key: string; label: string }[] = [
  { key: "responsable_predicacion", label: "Predicación" },
  { key: "responsable_adoracion", label: "Adoración" },
  { key: "responsable_oracion", label: "Oración" },
  { key: "responsable_invitacion", label: "Invitación" },
  { key: "responsable_consolidacion", label: "Consolidación" },
  { key: "responsable_seguimiento", label: "Seguimiento" },
];

/**
 * Barra de acciones masivas para Planeación de grupos.
 * - Confirmar asistencia (marca evaluacion_equipo.asistencia_confirmada = true)
 * - Asignar servidores (aplica plantilla de responsables)
 * Ambas operan con rollback: se guarda el estado previo por fila y ante
 * cualquier error se restauran las filas ya modificadas.
 */
export default function PlanificacionBulkBar({ selectedIds, onClear }: Props) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"confirm" | "assign" | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [template, setTemplate] = useState<Record<string, string>>({});

  if (selectedIds.length === 0) return null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["planificaciones"] });

  const bulkUpdateWithRollback = async (
    build: (row: any) => Record<string, any>,
    label: string
  ) => {
    const { data: rows, error: readErr } = await supabase
      .from("planificaciones_grupo")
      .select("*")
      .in("id", selectedIds);
    if (readErr || !rows) {
      toast.error("No se pudieron leer las planificaciones seleccionadas");
      return;
    }
    const applied: { id: string; prev: any }[] = [];
    for (const row of rows) {
      const patch = build(row);
      const { error } = await supabase
        .from("planificaciones_grupo")
        .update(patch)
        .eq("id", row.id);
      if (error) {
        // Rollback
        for (const a of applied) {
          await supabase.from("planificaciones_grupo").update(a.prev).eq("id", a.id);
        }
        toast.error(`${label} falló. Se revirtieron los cambios (${applied.length}).`);
        invalidate();
        return;
      }
      applied.push({ id: row.id, prev: row });
    }
    toast.success(`${label} aplicada a ${applied.length} planificación(es)`);
    invalidate();
    onClear();
  };

  const handleConfirmAsistencia = async () => {
    setBusy("confirm");
    try {
      await bulkUpdateWithRollback((row) => {
        const prev = (row.evaluacion_equipo ?? {}) as Record<string, any>;
        return {
          evaluacion_equipo: {
            ...prev,
            asistencia_confirmada: true,
            asistencia_confirmada_at: new Date().toISOString(),
          },
        };
      }, "Confirmación de asistencia");
    } finally {
      setBusy(null);
    }
  };

  const handleAssignServidores = async () => {
    const patch = Object.fromEntries(
      Object.entries(template).filter(([, v]) => v && v.trim().length > 0)
    );
    if (Object.keys(patch).length === 0) {
      toast.error("Completa al menos un rol antes de aplicar");
      return;
    }
    setBusy("assign");
    try {
      await bulkUpdateWithRollback(() => patch, "Asignación de servidores");
      setAssignOpen(false);
      setTemplate({});
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div
        role="region"
        aria-label={`${selectedIds.length} planificaciones seleccionadas`}
        className="sticky top-2 z-10 rounded-xl border bg-card shadow-md p-3 flex flex-wrap items-center gap-2 animate-fade-in"
      >
        <span className="text-sm font-medium mr-2">
          {selectedIds.length} seleccionada{selectedIds.length === 1 ? "" : "s"}
        </span>
        <Button
          size="sm"
          variant="default"
          className="gap-2"
          disabled={busy !== null}
          onClick={handleConfirmAsistencia}
        >
          {busy === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirmar asistencia
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          disabled={busy !== null}
          onClick={() => setAssignOpen(true)}
        >
          <UserPlus className="h-4 w-4" /> Asignar servidores
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto gap-1"
          onClick={onClear}
          aria-label="Limpiar selección"
        >
          <X className="h-4 w-4" /> Limpiar
        </Button>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar servidores</DialogTitle>
            <DialogDescription>
              Los nombres se aplicarán a las {selectedIds.length} planificación(es) seleccionadas.
              Los campos vacíos se ignoran. Si una fila falla se revierten todas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 py-2">
            {ROLES.map((r) => (
              <div key={r.key} className="space-y-1">
                <Label htmlFor={`bulk-${r.key}`}>{r.label}</Label>
                <Input
                  id={`bulk-${r.key}`}
                  value={template[r.key] ?? ""}
                  onChange={(e) => setTemplate((t) => ({ ...t, [r.key]: e.target.value }))}
                  placeholder="Nombre del servidor"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)} disabled={busy !== null}>
              Cancelar
            </Button>
            <Button onClick={handleAssignServidores} disabled={busy !== null} className="gap-2">
              {busy === "assign" && <Loader2 className="h-4 w-4 animate-spin" />} Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
