import PageHeader from "@/components/shared/PageHeader";
import MetricCard from "@/components/shared/MetricCard";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import DonacionFormDialog from "@/components/forms/DonacionFormDialog";
import { Heart, TrendingUp, DollarSign } from "lucide-react";
import { useDonaciones } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import ExportDropdown from "@/components/shared/ExportDropdown";
import PageSkeleton from "@/components/shared/PageSkeleton";

export default function DonacionesPage() {
  const { data: donaciones, isLoading } = useDonaciones();

  if (isLoading) {
    return (
      <PageSkeleton variant="list" />
    );
  }

  const data = donaciones || [];
  const totalDonaciones = data.reduce((s, d) => s + Number(d.monto), 0);
  const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;

  const tableData = data.map(d => ({
    ...d,
    donante: (d as any).personas ? `${(d as any).personas.nombres} ${(d as any).personas.apellidos}` : "Anónimo",
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Donaciones" description="Registro y seguimiento de donaciones">
        <ExportDropdown
          title="Donaciones"
          filename="donaciones"
          columns={[
            { header: "Donante", key: "donante" },
            { header: "Tipo", key: "tipo" },
            { header: "Monto", key: "monto" },
            { header: "Fecha", key: "fecha" },
            { header: "Método", key: "metodo_pago" },
            { header: "Estado", key: "estado" },
          ]}
          data={tableData}
        />
        <DonacionFormDialog />
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard title="Total Donaciones" value={fmt(totalDonaciones)} icon={DollarSign} variant="success" />
        <MetricCard title="Cantidad" value={data.length} icon={Heart} variant="accent" />
        <MetricCard title="Promedio" value={data.length ? `$${Math.round(totalDonaciones / data.length).toLocaleString()}` : "$0"} icon={TrendingUp} variant="default" />
      </div>

      <DataTable
        data={tableData}
        searchKey="donante"
        searchPlaceholder="Buscar donante..."
        filterKey="tipo"
        filterPlaceholder="Tipo"
        filterOptions={[
          { value: "Única", label: "Única" },
          { value: "Diezmo", label: "Diezmo" },
          { value: "Ofrenda", label: "Ofrenda" },
          { value: "Especial", label: "Especial" },
        ]}
        columns={[
          {
            key: "donante", label: "Donante",
            render: (d: any) => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Heart className="h-4 w-4 text-accent" />
                </div>
                <span className="font-medium text-sm">{d.donante}</span>
              </div>
            )
          },
          { key: "tipo", label: "Tipo", render: (d: any) => <StatusBadge status={d.tipo || "—"} /> },
          { key: "monto", label: "Monto", render: (d: any) => <span className="text-success font-semibold">${Number(d.monto).toLocaleString()}</span> },
          { key: "fecha", label: "Fecha" },
          { key: "metodo_pago", label: "Método", render: (d: any) => d.metodo_pago || "—" },
          { key: "estado", label: "Estado", render: (d: any) => <StatusBadge status={d.estado || "Completada"} /> },
        ]}
      />
    </div>
  );
}
