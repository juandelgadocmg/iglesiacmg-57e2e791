import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { Users, FileText, SearchX, ClipboardList } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "Shared/EmptyState",
  component: EmptyState,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

const wrap = (node: React.ReactNode) => <div className="w-[560px]">{node}</div>;

export const SinDatos: Story = {
  args: {
    icon: FileText,
    title: "Aún no hay planificaciones",
    description: "Crea la primera hoja de planeación semanal para tus Casas de Paz.",
    action: <Button size="sm">Nueva planificación</Button>,
  },
  render: (args) => wrap(<EmptyState {...args} />),
};

export const SinResultados: Story = {
  args: {
    icon: SearchX,
    title: "Sin resultados",
    description: "Ningún reporte coincide con los filtros aplicados.",
    action: (
      <Button size="sm" variant="outline">Limpiar filtros</Button>
    ),
  },
  render: (args) => wrap(<EmptyState {...args} />),
};

export const Hero: Story = {
  args: {
    icon: Users,
    title: "Bienvenido al módulo de Grupos",
    description: "Aquí verás la planificación, reportes y tesorería de cada Casa de Paz.",
    action: <Button>Comenzar</Button>,
    secondary: <Button variant="ghost">Ver guía</Button>,
    variant: "hero",
  },
  render: (args) => wrap(<EmptyState {...args} />),
};

export const Compact: Story = {
  args: {
    icon: ClipboardList,
    title: "Sin registros esta semana",
    variant: "compact",
  },
  render: (args) => wrap(<EmptyState {...args} />),
};
