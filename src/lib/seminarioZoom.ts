// Generador determinístico de links Zoom (sin API real).
// Produce un meeting id de 10-11 dígitos y un password derivados de docente + periodo + materia.
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
  const meetingId = String(8000000000 + (h % 1999999999)); // 10 dígitos plausibles
  const pwd = (h.toString(36) + "cmg").slice(0, 8);
  const url = `https://zoom.us/j/${meetingId}?pwd=${pwd}`;
  return { url, meetingId, pwd };
}
