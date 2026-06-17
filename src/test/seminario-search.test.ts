import { describe, it, expect } from "vitest";
import { normText, normDoc, matchesPersona } from "@/lib/seminarioSearch";

describe("normText", () => {
  it("convierte a minúsculas y quita acentos", () => {
    expect(normText("María JOSÉ Núñez")).toBe("maria jose nunez");
  });
  it("maneja null/undefined sin romper", () => {
    expect(normText(null)).toBe("");
    expect(normText(undefined)).toBe("");
  });
});

describe("normDoc", () => {
  it("elimina guiones, espacios, puntos y comas", () => {
    expect(normDoc("1.105-952 738")).toBe("1105952738");
    expect(normDoc(" CC-1,234.567 ")).toBe("cc1234567");
  });
  it("respeta mayúsculas/minúsculas", () => {
    expect(normDoc("ABc-123")).toBe("abc123");
  });
});

describe("matchesPersona", () => {
  const persona = { nombres: "María José", apellidos: "Núñez Peña", documento: "1105952738" };

  it("encuentra por nombre con acentos y mayúsculas distintas", () => {
    expect(matchesPersona("MARIA jose", persona)).toBe(true);
    expect(matchesPersona("núñez", persona)).toBe(true);
  });

  it("encuentra por CC con guiones/espacios/puntos", () => {
    expect(matchesPersona("1.105-952 738", persona)).toBe(true);
    expect(matchesPersona("1105-952738", persona)).toBe(true);
    expect(matchesPersona("1105952738", persona)).toBe(true);
  });

  it("no devuelve falsos positivos", () => {
    expect(matchesPersona("zzz", persona)).toBe(false);
    expect(matchesPersona("9999999999", persona)).toBe(false);
  });

  it("query vacía hace match con todo", () => {
    expect(matchesPersona("", persona)).toBe(true);
    expect(matchesPersona("   ", persona)).toBe(true);
  });

  it("acepta el campo 'nombre' (docente) además de nombres/apellidos", () => {
    expect(matchesPersona("carlos", { nombre: "Carlos Delgado", documento: "123" })).toBe(true);
    expect(matchesPersona("123", { nombre: "Carlos Delgado", documento: "123" })).toBe(true);
  });
});
