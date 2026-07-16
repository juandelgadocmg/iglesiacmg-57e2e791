import { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import InscripcionFormDialog from "@/components/forms/InscripcionFormDialog";
import { useInscripciones, useUpdateInscripcion, useDeleteInscripcion } from "@/hooks/useDatabase";
import { useEventos } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import ExportDropdown from "@/components/shared/ExportDropdown";
import PageSkeleton from "@/components/shared/PageSkeleton";

export default function InscripcionesPage() {
  const { data: eventos, isLoading: loadingEventos } = useEventos();
  const [selectedEvento, setSelectedEvento] = useState<string | null>(null);
  const { data: inscripciones, isLoading: loadingInsc } = useInscripciones(selectedEvento);
  const updateInscripcion = useUpdateInscripcion();
  const deleteInscripcion = useDeleteInscripcion();

  const isLoading = loadingEventos;

  if (isLoading) {
    return (
      <PageSkeleton variant="list" />
    );
  }

  const eventoActual = eventos?.find(e => e.id === selectedEvento);
  const totalInscritos = inscripciones?.length || 0;
  const confirmados = inscripciones?.filter(i => i.confirmado).length || 0;

  const handleConfirm = async (id: string, confirmado: boolean) => {
    try {
      await updateInscripcion.mutateAsync({ id, confirmado });
      toast.success(confirmado ? "Inscripción confirmada" : "Confirmación removida");
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInscripcion.mutateAsync(id);
      toast.success("Inscripción eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handlePago = async (id: string, estado: string) => {
    try {
      await updateInscripcion.mutateAsync({ id, estado_pago: estado });
      toast.success("Estado de pago actualizado");
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const tableData = (inscripciones || []).map(i => ({
    ...i,
    personaNombre: `${(i as any).personas?.nombres || ""} ${(i as any).personas?.apellidos || ""}`.trim(),
    eventoNombre: (i as any).eventos?.nombre || "",
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Inscripciones" description="Gestión de inscripciones a eventos">
        {selectedEvento && tableData.length > 0 && (
          <ExportDropdown
            title={`Inscripciones - ${eventoActual?.nombre || ""}`}
            filename={`inscripciones-${eventoActual?.nombre || "evento"}`}
            columns={[
              { header: "Persona", key: "personaNombre" },
              { header: "Evento", key: "eventoNombre" },
              { header: "Confirmado", key: "confirmado" },
              { header: "Estado Pago", key: "estado_pago" },
              { header: "Fecha Inscripción", key: "created_at" },
            ]}
            data={tableData}
          />
        )}
        {selectedEvento && <InscripcionFormDialog eventoId={selectedEvento} />}
      </PageHeader>

      {/* Selector de evento */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 max-w-md">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Seleccionar evento</label>
          <Select value={selectedEvento || ""} onValueChange={v => setSelectedEvento(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Elige un evento..." />
            </SelectTrigger>
            <SelectContent>
              {(eventos || []).map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nombre} — {e.fecha_inicio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEvento && eventoActual && (
          <div className="flex gap-3 mt-4 sm:mt-6">
            <div className="bg-card border rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Inscritos</p>
              <p className="text-lg font-bold text-foreground">{totalInscritos}{eventoActual.cupos ? `/${eventoActual.cupos}` : ""}</p>
            </div>
            <div className="bg-card border rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Confirmados</p>
              <p className="text-lg font-bold text-primary">{confirmados}</p>
            </div>
          </div>
        )}
      </div>

      {!selectedEvento ? (
        <div className="bg-card rounded-lg border p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Selecciona un evento</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Elige un evento del listado para ver y gestionar sus inscripciones.
          </p>
        </div>
      ) : loadingInsc ? (
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <DataTable
          data={tableData}
          searchKey="personaNombre"
          searchPlaceholder="Buscar persona..."
          filterKey="estado_pago"
          filterPlaceholder="Estado de pago"
          filterOptions={[
            { value: "Pendiente", label: "Pendiente" },
            { value: "Pagado", label: "Pagado" },
            { value: "Exento", label: "Exento" },
          ]}
          columns={[
            {
              key: "personaNombre",
              label: "Persona",
              render: (i: any) => (
                <span className="font-medium text-sm">{i.personaNombre || "Sin nombre"}</span>
              ),
            },
            {
              key: "created_at",
              label: "Fecha inscripción",
              render: (i: any) => new Date(i.created_at).toLocaleDateString("es"),
            },
            {
              key: "confirmado",
              label: "Confirmado",
              render: (i: any) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleConfirm(i.id, !i.confirmado); }}
                  className="gap-1.5"
                >
                  {i.confirmado ? (
                    <><CheckCircle className="h-4 w-4 text-primary" /> Sí</>
                  ) : (
                    <><XCircle className="h-4 w-4 text-muted-foreground" /> No</>
                  )}
                </Button>
              ),
            },
            {
              key: "estado_pago",
              label: "Pago",
              render: (i: any) => (
                <Select value={i.estado_pago || "Pendiente"} onValueChange={v => handlePago(i.id, v)}>
                  <SelectTrigger className="h-8 w-28 text-xs" onClick={e => e.stopPropagation()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Pagado">Pagado</SelectItem>
                    <SelectItem value="Exento">Exento</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
            {
              key: "actions",
              label: "",
              render: (i: any) => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleDelete(i.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
