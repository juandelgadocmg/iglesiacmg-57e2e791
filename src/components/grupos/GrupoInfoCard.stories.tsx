import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { Users, Calendar, DollarSign, Eye, Trash2 } from "lucide-react";
import {
  GrupoInfoCard,
  GrupoInfoCardSkeleton,
  GrupoCardsSkeletonGrid,
} from "@/components/grupos/GrupoInfoCard";

const meta: Meta<typeof GrupoInfoCard> = {
  title: "Grupos/GrupoInfoCard",
  component: GrupoInfoCard,
  parameters: { layout: "centered" },
  argTypes: {
    onClick: { action: "clicked" },
  },
};
export default meta;
type Story = StoryObj<typeof GrupoInfoCard>;

const container = (children: React.ReactNode) => (
  <div className="w-[360px]">{children}</div>
);

export const Basica: Story = {
  args: {
    title: "Casa de Paz Norte",
    subtitle: "Red Nissi · Jueves",
    description: "Reunión semanal de crecimiento familiar.",
  },
  render: (args) => container(<GrupoInfoCard {...args} />),
};

export const ConBadgeInfo: Story = {
  args: {
    title: "Planeación · Semana 32",
    subtitle: "Red Rohi",
    badge: { label: "Plan", tone: "info" },
    metaDate: { label: "Creada", value: "10 jul 2026" },
  },
  render: (args) => container(<GrupoInfoCard {...args} />),
};

export const TodosLosTonos: Story = {
  render: () => (
    <div className="grid gap-4 w-[720px] sm:grid-cols-2">
      {(["neutral", "info", "success", "warning", "danger"] as const).map((tone) => (
        <GrupoInfoCard
          key={tone}
          title={`Tono ${tone}`}
          subtitle="Ejemplo de badge"
          badge={{ label: tone.toUpperCase(), tone }}
        />
      ))}
    </div>
  ),
};

export const ConResumenYAcciones: Story = {
  args: {
    title: "Reporte · Casa Norte",
    subtitle: "Red Nissi",
    badge: { label: "Aprobado", tone: "success" },
    metaDate: { label: "Reunión", value: "12 jul 2026" },
    summaryTitle: "Resumen semanal",
    summary: [
      { label: "Asistentes", value: 14, icon: Users },
      { label: "Ayuno", value: "Vie 11", icon: Calendar },
      { label: "Ofrenda", value: "$150.000", icon: DollarSign, emphasis: true, divided: true },
    ],
    actions: (
      <>
        <Button size="sm" variant="outline" className="gap-1">
          <Eye className="h-3.5 w-3.5" /> Ver
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </>
    ),
  },
  render: (args) => container(<GrupoInfoCard {...args} />),
};

export const Clickable: Story = {
  args: {
    title: "Tarjeta interactiva",
    subtitle: "Enter / Espacio la activa",
    badge: { label: "Interactiva", tone: "info" },
    onClick: () => alert("Card activada"),
  },
  render: (args) => container(<GrupoInfoCard {...args} />),
};

export const SkeletonUnico: Story = {
  render: () => container(<GrupoInfoCardSkeleton />),
};

export const SkeletonGrid: Story = {
  render: () => (
    <div className="w-[960px]">
      <GrupoCardsSkeletonGrid count={6} />
    </div>
  ),
};
