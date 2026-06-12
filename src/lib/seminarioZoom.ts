// Generador determinístico de links Zoom (sin API real).
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface ZoomCtx {
  docente?: string | null;
  periodoCodigo?: string | null;
  materiaCodigo?: string | null;
  materiaId?: string | null;
}

export function generateZoomLink(ctx: ZoomCtx) {
  const seed = [ctx.docente || "docente", ctx.periodoCodigo || "periodo", ctx.materiaCodigo || ctx.materiaId || "materia"].join("|");
  const h = hash(seed);
  const meetingId = String(8000000000 + (h % 1999999999));
  const pwd = (h.toString(36) + "cmg").slice(0, 8);
  const url = `https://zoom.us/j/${meetingId}?pwd=${pwd}`;
  return { url, meetingId, pwd };
}

/** Devuelve true si el meeting_id almacenado YA NO coincide con el derivado del contexto actual. */
export function isZoomStale(oferta: any, ctx: ZoomCtx) {
  if (!oferta?.zoom_link) return false;
  if (oferta.modalidad === "presencial") return false;
  const expected = generateZoomLink(ctx);
  return oferta.zoom_meeting_id ? oferta.zoom_meeting_id !== expected.meetingId : false;
}
