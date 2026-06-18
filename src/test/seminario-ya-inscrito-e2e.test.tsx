/**
 * E2E-style render tests para el combobox y la tabla de "Ya inscrito":
 * - Romero Erika y Espinel Ximena aparecen con badge "Ya inscrito · <periodo>" y disabled
 * - Mismo texto de badge en tabla y combobox
 * - Accesibilidad (role=option, aria-disabled, aria-label)
 * - Toggle "Solo disponibles / Incluir ya inscritos" no altera el pageSize
 *   y preserva la búsqueda por nombre/CC
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { useState } from "react";
import SearchableCombobox, { type ComboboxItem } from "@/components/seminario/SearchableCombobox";
import { yaInscritoBadge, personaFullName } from "@/lib/seminarioFormat";

type Persona = { id: string; nombres: string; apellidos: string; documento: string };
type Inscripcion = { id: string; persona_id: string; sem_periodos: { nombre: string; codigo: string } };

const ERIKA: Persona = { id: "p1", nombres: "Erika Vanessa", apellidos: "Romero Garnica", documento: "1.105-952 738" };
const XIMENA: Persona = { id: "p2", nombres: "Yaddith Ximena", apellidos: "Espinel Mendez", documento: "52123456" };
const PEREZ: Persona = { id: "p3", nombres: "Juan", apellidos: "Pérez", documento: "9000000" };

const periodo2025_2 = { nombre: "2025-2", codigo: "2025-2" };
const periodo2025_1 = { nombre: "2025-1", codigo: "2025-1" };

const inscripciones: Inscripcion[] = [
  { id: "i1", persona_id: "p1", sem_periodos: periodo2025_2 },
  { id: "i2", persona_id: "p2", sem_periodos: periodo2025_1 },
];

// Replica exacta del builder usado por InscripcionDialog
function buildItems(
  personas: Persona[],
  ins: Inscripcion[],
  opts: { incluirYaInscritos: boolean; onVerInscripcion?: (i: Inscripcion) => void }
): (ComboboxItem & { _inscrita: boolean })[] {
  const map = new Map<string, { ins: Inscripcion; periodoNombre: string; badge: string }>();
  ins.forEach(i => map.set(i.persona_id, {
    ins: i,
    periodoNombre: i.sem_periodos.nombre,
    badge: yaInscritoBadge(i.sem_periodos),
  }));
  const base = personas.map(p => {
    const info = map.get(p.id);
    const inscrita = !!info;
    const fullName = personaFullName(p);
    return {
      id: p.id,
      label: fullName,
      sub: inscrita ? `${p.documento} · Inscrito en ${info!.periodoNombre}` : p.documento,
      disabled: inscrita,
      badge: inscrita ? info!.badge : undefined,
      ariaLabel: inscrita
        ? `${fullName}, ${info!.badge}. No disponible para nueva inscripción.`
        : `${fullName}, documento ${p.documento}`,
      action: inscrita
        ? {
            label: "Ver inscripción",
            ariaLabel: `Ver inscripción de ${fullName} en ${info!.periodoNombre}`,
            onClick: () => opts.onVerInscripcion?.(info!.ins),
          }
        : undefined,
      _inscrita: inscrita,
    };
  });
  return opts.incluirYaInscritos ? base : base.filter(i => !i._inscrita);
}

function Harness({ initialInclude = true }: { initialInclude?: boolean }) {
  const [incluir, setIncluir] = useState(initialInclude);
  const [value, setValue] = useState("");
  const items = buildItems([ERIKA, XIMENA, PEREZ], inscripciones, { incluirYaInscritos: incluir });
  return (
    <div>
      <label>
        <input
          type="checkbox"
          aria-label="Incluir ya inscritos"
          checked={incluir}
          onChange={e => setIncluir(e.target.checked)}
        />
        Incluir ya inscritos
      </label>
      <SearchableCombobox
        items={items}
        value={value}
        onChange={setValue}
        placeholder="Buscar persona…"
        emptyLabel="Sin resultados"
        width="w-full"
      />
    </div>
  );
}

describe("E2E combobox 'Ya inscrito'", () => {
  it("por defecto muestra toda la membresía, incluyendo personas ya inscritas", () => {
    render(<Harness />);
    fireEvent.focus(screen.getByPlaceholderText("Buscar persona…"));
    fireEvent.change(screen.getByPlaceholderText("Buscar persona…"), { target: { value: "ximena" } });

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("option", { name: /Yaddith Ximena Espinel Mendez.*Ya inscrito/i })).toBeInTheDocument();
  });

  it("Romero Erika aparece deshabilitada con badge 'Ya inscrito · 2025-2'", () => {
    render(<Harness />);
    fireEvent.focus(screen.getByPlaceholderText("Buscar persona…"));
    fireEvent.change(screen.getByPlaceholderText("Buscar persona…"), { target: { value: "romero erika" } });

    const listbox = screen.getByRole("listbox");
    const option = within(listbox).getByRole("option", { name: /Erika Vanessa Romero Garnica.*Ya inscrito · 2025-2/i });
    expect(option).toHaveAttribute("aria-disabled", "true");
    // El texto visible del badge coincide exactamente con yaInscritoBadge()
    expect(within(option).getByText("Ya inscrito · 2025-2")).toBeInTheDocument();
    // Botón "Ver inscripción" presente con aria-label específico
    expect(within(option).getByRole("button", { name: /Ver inscripción de Erika Vanessa Romero Garnica en 2025-2/i })).toBeInTheDocument();
  });

  it("Espinel Ximena aparece deshabilitada con badge 'Ya inscrito · 2025-1'", () => {
    render(<Harness />);
    fireEvent.focus(screen.getByPlaceholderText("Buscar persona…"));
    fireEvent.change(screen.getByPlaceholderText("Buscar persona…"), { target: { value: "espinel" } });

    const listbox = screen.getByRole("listbox");
    const option = within(listbox).getByRole("option", { name: /Yaddith Ximena Espinel Mendez.*Ya inscrito · 2025-1/i });
    expect(option).toHaveAttribute("aria-disabled", "true");
    expect(within(option).getByText("Ya inscrito · 2025-1")).toBeInTheDocument();
  });

  it("También se encuentran por CC con separadores (no rompe la búsqueda)", () => {
    render(<Harness />);
    fireEvent.focus(screen.getByPlaceholderText("Buscar persona…"));
    fireEvent.change(screen.getByPlaceholderText("Buscar persona…"), { target: { value: "1.105-952 738" } });
    // sub incluye el documento sin normalizar, el filtro interno del combobox usa norm()
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("option", { name: /Erika Vanessa Romero Garnica/i })).toBeInTheDocument();
  });

  it("Items deshabilitados NO se seleccionan al hacer click", () => {
    render(<Harness />);
    fireEvent.focus(screen.getByPlaceholderText("Buscar persona…"));
    fireEvent.change(screen.getByPlaceholderText("Buscar persona…"), { target: { value: "romero" } });
    const listbox = screen.getByRole("listbox");
    const option = within(listbox).getByRole("option", { name: /Romero Garnica/i });
    fireEvent.mouseDown(option);
    // El input sigue mostrando la búsqueda (no se cerró ni seleccionó)
    expect(screen.getByPlaceholderText("Buscar persona…")).toHaveValue("romero");
  });
});

describe("Consistencia del badge tabla vs combobox", () => {
  it("yaInscritoBadge() devuelve el mismo string usado en ambos lugares", () => {
    expect(yaInscritoBadge(periodo2025_2)).toBe("Ya inscrito · 2025-2");
    expect(yaInscritoBadge(periodo2025_1)).toBe("Ya inscrito · 2025-1");
    expect(yaInscritoBadge(null as any)).toBe("Ya inscrito · —");
  });

  it("personaFullName() produce el mismo nombre completo para tabla, badge y aria-label", () => {
    expect(personaFullName(ERIKA)).toBe("Erika Vanessa Romero Garnica");
    expect(personaFullName(XIMENA)).toBe("Yaddith Ximena Espinel Mendez");
  });
});

describe("Toggle 'Solo disponibles / Incluir ya inscritos' preserva paginado y búsqueda", () => {
  it("Al alternar el toggle, el query del combobox se mantiene", () => {
    render(<Harness initialInclude />);
    const input = screen.getByPlaceholderText("Buscar persona…");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "perez" } });
    expect(input).toHaveValue("perez");

    // Toggle a "Solo disponibles" (perez no está inscrito → sigue visible)
    fireEvent.click(screen.getByLabelText("Incluir ya inscritos"));
    expect(input).toHaveValue("perez");
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("option", { name: /Juan Pérez/i })).toBeInTheDocument();
  });

  it("pageSize del combobox es estable y NO cambia por el filtro externo", () => {
    // Generar 200 personas + las 2 inscritas
    const many: Persona[] = Array.from({ length: 200 }, (_, i) => ({
      id: `m-${i}`, nombres: `Estudiante${i}`, apellidos: `Apellido${i}`, documento: `${1000000 + i}`,
    }));
    const ins: Inscripcion[] = [
      { id: "ix", persona_id: "m-0", sem_periodos: periodo2025_2 },
      { id: "iy", persona_id: "m-1", sem_periodos: periodo2025_1 },
    ];
    const conInscritos = buildItems(many, ins, { incluirYaInscritos: true });
    const soloDisp = buildItems(many, ins, { incluirYaInscritos: false });

    function Page({ items }: { items: ComboboxItem[] }) {
      return <SearchableCombobox items={items} value="" onChange={() => {}} placeholder="x" pageSize={50} />;
    }

    const { unmount } = render(<Page items={conInscritos} />);
    fireEvent.focus(screen.getByPlaceholderText("x"));
    expect(screen.getByRole("listbox").querySelectorAll('[role="option"]').length).toBe(50);
    unmount();

    render(<Page items={soloDisp} />);
    fireEvent.focus(screen.getByPlaceholderText("x"));
    // Mismo pageSize=50 visible, NO se reduce ni se infla por el filtro externo
    expect(screen.getByRole("listbox").querySelectorAll('[role="option"]').length).toBe(50);
  });
});
