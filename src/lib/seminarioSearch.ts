// Helpers de normalización para búsquedas en Seminario.
// Aseguran que mayúsculas, acentos, espacios, guiones y puntos no afecten el match.

export const normText = (s: any): string =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// Documento de identidad: ignora separadores comunes (guiones, espacios, puntos, comas).
export const normDoc = (s: any): string =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\-_.,]/g, "")
    .trim();

// Coincidencia conjunta: prueba como texto y como documento.
// Soporta múltiples tokens separados por espacio: TODOS deben aparecer
// (en cualquier orden) en el nombre, o el query completo en el documento.
// Esto permite que "romero erika" matchee con "Erika Vanessa Romero Garnica".
export const matchesPersona = (
  query: string,
  fields: { nombres?: string | null; apellidos?: string | null; documento?: string | null; nombre?: string | null }
): boolean => {
  const qText = normText(query);
  const qDoc = normDoc(query);
  if (!qText && !qDoc) return true;
  const full = normText(`${fields.nombre ?? ""} ${fields.nombres ?? ""} ${fields.apellidos ?? ""}`);
  const doc = normDoc(fields.documento);
  const tokens = qText.split(/\s+/).filter(Boolean);
  const textMatch = tokens.length > 0 && tokens.every(t => full.includes(t));
  const docMatch = qDoc.length > 0 && doc.includes(qDoc);
  return textMatch || docMatch;
};
