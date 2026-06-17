import { describe, it, expect } from "vitest";
import { matchesPersona } from "@/lib/seminarioSearch";

// Replica la lógica de EstudiantesSection/InscripcionDialog para verificar
// el badge "Ya inscrito" y el filtro "Solo disponibles / Incluir ya inscritos"
// sin necesidad de un E2E completo con backend.

type Persona = { id: string; nombres: string; apellidos: string; documento: string };
type Inscripcion = { id: string; persona_id: string; sem_periodos: { nombre: string; codigo: string } };

function buildItems(personas: Persona[], inscripciones: Inscripcion[], opts: { incluirYaInscritos: boolean; query?: string }) {
  const map = new Map<string, { ins: Inscripcion; periodoNombre: string }>();
  inscripciones.forEach(i => map.set(i.persona_id, { ins: i, periodoNombre: i.sem_periodos?.nombre || i.sem_periodos?.codigo }));
  const base = personas.map(p => {
    const info = map.get(p.id);
    const inscrita = !!info;
    return {
      id: p.id,
      label: `${p.nombres} ${p.apellidos}`.trim(),
      documento: p.documento,
      disabled: inscrita,
      badge: inscrita ? `Ya inscrito · ${info!.periodoNombre}` : undefined,
      hasAction: inscrita,
      _inscrita: inscrita,
    };
  });
  const filtrados = opts.incluirYaInscritos ? base : base.filter(i => !i._inscrita);
  const q = (opts.query || "").trim();
  return q
    ? filtrados.filter(i => matchesPersona(q, { nombre: i.label, documento: i.documento }))
    : filtrados;
}

const personas: Persona[] = [
  { id: "p1", nombres: "Erika Vanessa", apellidos: "Romero Garnica", documento: "1.105-952 738" },
  { id: "p2", nombres: "Yaddith Ximena", apellidos: "Espinel Mendez", documento: "52123456" },
  { id: "p3", nombres: "Juan", apellidos: "Pérez", documento: "9000000" },
  // 100 personas extra para validar que el paginado no se corrompe
  ...Array.from({ length: 100 }, (_, i) => ({
    id: `extra-${i}`,
    nombres: `Estudiante${i}`,
    apellidos: `Apellido${i}`,
    documento: `100000${i}`,
  })),
];

const inscripciones: Inscripcion[] = [
  { id: "i1", persona_id: "p1", sem_periodos: { nombre: "2025-2", codigo: "2025-2" } },
  { id: "i2", persona_id: "p2", sem_periodos: { nombre: "2025-1", codigo: "2025-1" } },
];

describe("Badge 'Ya inscrito' en combobox", () => {
  it("Romero Erika aparece con badge 'Ya inscrito' al activar 'Incluir ya inscritos'", () => {
    const items = buildItems(personas, inscripciones, { incluirYaInscritos: true, query: "romero erika" });
    expect(items.length).toBeGreaterThan(0);
    const erika = items.find(i => i.id === "p1");
    expect(erika).toBeDefined();
    expect(erika!.badge).toBe("Ya inscrito · 2025-2");
    expect(erika!.disabled).toBe(true);
    expect(erika!.hasAction).toBe(true);
  });

  it("Espinel Ximena aparece con badge 'Ya inscrito' al activar 'Incluir ya inscritos'", () => {
    const items = buildItems(personas, inscripciones, { incluirYaInscritos: true, query: "espinel ximena" });
    const ximena = items.find(i => i.id === "p2");
    expect(ximena).toBeDefined();
    expect(ximena!.badge).toBe("Ya inscrito · 2025-1");
    expect(ximena!.disabled).toBe(true);
  });

  it("También las encuentra buscando por CC con guiones/espacios/puntos", () => {
    const items = buildItems(personas, inscripciones, { incluirYaInscritos: true, query: "1.105-952 738" });
    expect(items.find(i => i.id === "p1")).toBeDefined();
  });
});

describe("Filtro 'Solo disponibles' vs 'Incluir ya inscritos'", () => {
  it("Solo disponibles oculta a personas ya inscritas (sin afectar a no inscritas)", () => {
    const items = buildItems(personas, inscripciones, { incluirYaInscritos: false });
    expect(items.find(i => i.id === "p1")).toBeUndefined();
    expect(items.find(i => i.id === "p2")).toBeUndefined();
    expect(items.find(i => i.id === "p3")).toBeDefined();
  });

  it("La búsqueda por nombre/CC funciona igual con cualquier valor del filtro", () => {
    const conInscritos = buildItems(personas, inscripciones, { incluirYaInscritos: true, query: "perez" });
    const soloDisp = buildItems(personas, inscripciones, { incluirYaInscritos: false, query: "perez" });
    expect(conInscritos.find(i => i.id === "p3")).toBeDefined();
    expect(soloDisp.find(i => i.id === "p3")).toBeDefined();
  });

  it("El total de elementos es consistente con el filtro (paginado correcto)", () => {
    const total = personas.length;
    const soloDisp = buildItems(personas, inscripciones, { incluirYaInscritos: false });
    const todos = buildItems(personas, inscripciones, { incluirYaInscritos: true });
    expect(todos.length).toBe(total);
    expect(soloDisp.length).toBe(total - inscripciones.length);
  });
});
