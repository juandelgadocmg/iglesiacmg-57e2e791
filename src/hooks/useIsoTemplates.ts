import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { findIsoTemplate, type IsoMinisterioTemplate } from "@/lib/isoMinisterioTemplates";

const KEY = ["prog_iso_templates"];

export interface IsoTemplateOverride {
  ministerio_id: string;
  codigo: string | null;
  version: string | null;
  fecha_vigencia: string | null;
  titulo: string | null;
  estaciones: string[] | null;
  estaciones_texto: string[] | null;
  importante: string | null;
  responsabilidades: string | null;
  firmas: IsoMinisterioTemplate["firmas"] | null;
  tipos_evento: string[] | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fechas_incluidas: string[] | null;
  lider_nombre_manual: string | null;
}

export function useIsoTemplateOverrides() {
  return useQuery<IsoTemplateOverride[]>({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("prog_iso_templates").select("*");
      if (error) throw error;
      return (data || []) as IsoTemplateOverride[];
    },
  });
}

export function useUpsertIsoTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<IsoTemplateOverride> & { ministerio_id: string }) => {
      const { data, error } = await (supabase as any)
        .from("prog_iso_templates")
        .upsert(row, { onConflict: "ministerio_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteIsoTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ministerio_id: string) => {
      const { error } = await (supabase as any)
        .from("prog_iso_templates")
        .delete()
        .eq("ministerio_id", ministerio_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Mezcla base (código) + override (BD). El override gana donde tiene valor. */
export function mergeIsoTemplate(
  base: IsoMinisterioTemplate | null,
  override: IsoTemplateOverride | undefined,
  fallbackNombre: string
): IsoMinisterioTemplate | null {
  if (!base && !override) return null;
  const empty: IsoMinisterioTemplate = {
    nombreMinisterio: fallbackNombre,
    codigo: "",
    version: "01",
    fechaVigencia: "",
    titulo: `FORMATO PROGRAMACIÓN MINISTERIO ${fallbackNombre.toUpperCase()}`,
    estaciones: [],
    importante: "",
    responsabilidades: "",
    firmas: {
      elaboradoPor: { nombre: "", cargo: "" },
      revisadoPor: { nombre: "", cargo: "" },
      autorizadoPor: { nombre: "", cargo: "" },
    },
  };
  const b = base || empty;
  if (!override) return b;
  return {
    nombreMinisterio: b.nombreMinisterio,
    codigo: override.codigo ?? b.codigo,
    version: override.version ?? b.version,
    fechaVigencia: override.fecha_vigencia ?? b.fechaVigencia,
    titulo: override.titulo ?? b.titulo,
    estaciones: override.estaciones && override.estaciones.length > 0 ? override.estaciones : b.estaciones,
    estacionesTexto: override.estaciones_texto !== undefined ? override.estaciones_texto : b.estacionesTexto,
    importante: override.importante ?? b.importante,
    responsabilidades: override.responsabilidades ?? b.responsabilidades,
    firmas: override.firmas ?? b.firmas,
    tiposEvento: override.tipos_evento ?? b.tiposEvento,
    fechaInicio: override.fecha_inicio ?? b.fechaInicio ?? null,
    fechaFin: override.fecha_fin ?? b.fechaFin ?? null,
    fechasIncluidas: override.fechas_incluidas ?? b.fechasIncluidas ?? null,
    liderNombreManual: override.lider_nombre_manual ?? b.liderNombreManual ?? null,
  };
}

/** Devuelve la plantilla efectiva (base + override) para un ministerio. */
export function getEffectiveIsoTemplate(
  ministerioId: string,
  ministerioNombre: string,
  overrides: IsoTemplateOverride[]
): IsoMinisterioTemplate | null {
  const base = findIsoTemplate(ministerioNombre);
  const ov = overrides.find((o) => o.ministerio_id === ministerioId);
  if (!base && !ov) return null;
  return mergeIsoTemplate(base, ov, ministerioNombre);
}
