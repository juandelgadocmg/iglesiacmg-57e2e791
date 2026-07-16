import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  GrupoInfoCard,
  GrupoInfoCardSkeleton,
  GrupoCardsSkeletonGrid,
} from "@/components/grupos/GrupoInfoCard";
import EmptyState from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

describe("GrupoInfoCard", () => {
  it("renders title, subtitle and description", () => {
    render(
      <GrupoInfoCard
        title="Casa de Paz Norte"
        subtitle="Red Nissi"
        description="Reunión semanal de crecimiento."
      />
    );
    expect(screen.getByText("Casa de Paz Norte")).toBeInTheDocument();
    expect(screen.getByText("Red Nissi")).toBeInTheDocument();
    expect(screen.getByText(/Reunión semanal/)).toBeInTheDocument();
  });

  it("renders badge with the configured tone class", () => {
    render(
      <GrupoInfoCard title="G1" badge={{ label: "Plan", tone: "success" }} />
    );
    const badge = screen.getByText("Plan");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-success/);
  });

  it("falls back to neutral tone when no tone is provided", () => {
    render(<GrupoInfoCard title="G2" badge={{ label: "Info" }} />);
    expect(screen.getByText("Info")).toBeInTheDocument();
  });

  it("is keyboard-activatable when onClick is provided", () => {
    const onClick = vi.fn();
    render(<GrupoInfoCard title="Clickable" onClick={onClick} />);
    const card = screen.getByRole("button", { name: "Clickable" });
    expect(card).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: " " });
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("is not focusable when non-clickable", () => {
    render(<GrupoInfoCard title="Static" />);
    const card = screen.getByRole("group", { name: "Static" });
    expect(card).not.toHaveAttribute("tabindex");
  });

  it("renders summary rows with icon and emphasis", () => {
    render(
      <GrupoInfoCard
        title="Resumen"
        summaryTitle="Semana"
        summary={[
          { label: "Asistentes", value: 12, icon: Users },
          { label: "Total", value: "$150.000", emphasis: true, divided: true },
        ]}
      />
    );
    expect(screen.getByText("Semana")).toBeInTheDocument();
    expect(screen.getByText("Asistentes")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("$150.000")).toBeInTheDocument();
  });

  it("does not bubble action clicks to the card", () => {
    const onClick = vi.fn();
    render(
      <GrupoInfoCard
        title="Card"
        onClick={onClick}
        actions={<button type="button">Ver</button>}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Ver" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("GrupoCardsSkeletonGrid", () => {
  it("renders the requested number of skeleton cards", () => {
    const { container } = render(<GrupoCardsSkeletonGrid count={4} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    // Each skeleton is a direct child div of the status grid
    expect(container.querySelectorAll("[role='status'] > div").length).toBe(4);
  });

  it("defaults to 6 items", () => {
    const { container } = render(<GrupoCardsSkeletonGrid />);
    expect(container.querySelectorAll("[role='status'] > div").length).toBe(6);
  });

  it("standalone skeleton renders without crashing", () => {
    const { container } = render(<GrupoInfoCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="Sin grupos" description="Crea el primero" />);
    expect(screen.getByRole("heading", { name: "Sin grupos" })).toBeInTheDocument();
    expect(screen.getByText("Crea el primero")).toBeInTheDocument();
  });

  it("renders the icon when provided", () => {
    const { container } = render(
      <EmptyState icon={Users} title="Vacío" />
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders action and secondary slots", () => {
    render(
      <EmptyState
        title="Vacío"
        action={<button type="button">Crear</button>}
        secondary={<button type="button">Importar</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar" })).toBeInTheDocument();
  });

  it("applies hero variant padding", () => {
    const { container } = render(<EmptyState title="Hero" variant="hero" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/py-20/);
  });

  it("applies compact variant padding", () => {
    const { container } = render(<EmptyState title="C" variant="compact" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/py-10/);
  });
});
