import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { useCreatePeriodo, useUpdatePeriodo } from "@/hooks/useAcademia";
import { toast } from "sonner";

const schema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  estado: z.string().default("Abierto"),
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
  fecha_matricula_inicio: z.string().optional(),
  fecha_matricula_fin: z.string().optional(),
});

interface Props {
  escuelaId: string;
  periodo?: any; // si viene → modo edición
  trigger?: React.ReactNode; // trigger personalizado (para menús)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function PeriodoFormDialog({ escuelaId, periodo, trigger, open: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const createPeriodo = useCreatePeriodo();
  const updatePeriodo = useUpdatePeriodo();
  const isEdit = !!periodo;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "",
      estado: "Abierto",
      fecha_inicio: "",
      fecha_fin: "",
      fecha_matricula_inicio: "",
      fecha_matricula_fin: "",
    },
  });

  // Reset al abrir / cuando cambia el periodo
  useEffect(() => {
    if (open) {
      form.reset({
        nombre: periodo?.nombre || "",
        estado: periodo?.estado || "Abierto",
        fecha_inicio: periodo?.fecha_inicio || "",
        fecha_fin: periodo?.fecha_fin || "",
        fecha_matricula_inicio: periodo?.fecha_matricula_inicio || "",
        fecha_matricula_fin: periodo?.fecha_matricula_fin || "",
      });
    }
  }, [open, periodo]);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      const payload = {
        nombre: values.nombre,
        estado: values.estado,
        fecha_inicio: values.fecha_inicio || null,
        fecha_fin: values.fecha_fin || null,
        fecha_matricula_inicio: values.fecha_matricula_inicio || null,
        fecha_matricula_fin: values.fecha_matricula_fin || null,
      };

      if (isEdit) {
        await updatePeriodo.mutateAsync({ id: periodo.id, ...payload });
        toast.success("Período actualizado");
      } else {
        await createPeriodo.mutateAsync({
          escuela_id: escuelaId,
          ...payload,
          fecha_inicio: payload.fecha_inicio || undefined,
          fecha_fin: payload.fecha_fin || undefined,
          fecha_matricula_inicio: payload.fecha_matricula_inicio || undefined,
          fecha_matricula_fin: payload.fecha_matricula_fin || undefined,
        });
        toast.success("Período creado");
      }
      form.reset();
      setOpen(false);
    } catch {
      toast.error(isEdit ? "Error al actualizar el período" : "Error al crear el período");
    }
  };

  const isPending = createPeriodo.isPending || updatePeriodo.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            isEdit
              ? <Button size="sm" variant="outline"><Pencil className="h-4 w-4 mr-1" /> Editar</Button>
              : <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo período</Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Período" : "Nuevo Período"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField control={form.control} name="nombre" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del período *</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Discipulando Naciones 2025 I" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="estado" render={({ field }) => (
              <FormItem>
                <FormLabel>Estado del período</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Abierto">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        Abierto — período activo o en curso
                      </span>
                    </SelectItem>
                    <SelectItem value="Cerrado">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                        Cerrado — período histórico o finalizado
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Los períodos <strong>Cerrados</strong> no admiten nuevas matrículas.
                </p>
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="fecha_inicio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha inicio período</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="fecha_fin" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha fin período</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="fecha_matricula_inicio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Inicio matrículas</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="fecha_matricula_fin" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fin matrículas</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar período"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
