import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileDown, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  PlanillaColKey, PLANILLA_COL_LABEL, PlanillaSnapshot,
  computeHash, newPlanillaRef, renderPlanillaHtml, renderPlanillaExcelBlob,
} from "@/lib/planillaRender";

interface Persona { id: string; nombres: string; apellidos: string; }
interface Asistencia { checkin_time?: string | null; puntualidad?: string | null; metodo_registro?: string | null; firma_data_url?: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  servicio: any;
  personas: Persona[];
  asistMap: Map<string, Asistencia>;
  localAttendance: Record<string, boolean>;
  config: any;
  /** When present, the generated planilla is linked as a new version of this parent. */
  reopenFrom?: { id: string; version: number } | null;
}

const ALL_COLS: PlanillaColKey[] = ["nombre","hora","puntualidad","metodo","firma"];

export default function PlanillaPreviewDialog({
  open, onOpenChange, servicio, personas, asistMap, localAttendance, config, reopenFrom,
}: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [ref, setRef] = useState<string>("");
  const [hash, setHash] = useState<string>("");

  const cfg = useMemo(() => {
    const c = config || {};
    const cols: PlanillaColKey[] = (Array.isArray(c.planilla_columnas) && c.planilla_columnas.length
      ? c.planilla_columnas
      : ALL_COLS
    ).filter((k: string) => (ALL_COLS as readonly string[]).includes(k));
    return {
      titulo: c.planilla_titulo || "Planilla de Asistencia",
      subtitulo: c.planilla_subtitulo || c.nombre_iglesia || "",
      pie: c.planilla_pie || "DOXA · CMG Admin",
      color: c.planilla_color_encabezado || "#111111",
      mostrarLogo: c.planilla_mostrar_logo !== false,
      logoUrl: c.logo_url || "",
      columnas: cols,
    };
  }, [config]);

  const presentes = useMemo(() => personas
    .filter(p => localAttendance[p.id])
    .map(p => {
      const a = asistMap.get(p.id) || {};
      return {
        nombre: `${p.nombres} ${p.apellidos}`,
        hora: a.checkin_time ? new Date(a.checkin_time).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "—",
        puntualidad: a.puntualidad || "—",
        metodo: (a.metodo_registro || "manual").toUpperCase(),
        firma: a.firma_data_url || "",
      };
    }), [personas, asistMap, localAttendance]);

  const tasa = personas.length ? Math.round((presentes.length / personas.length) * 100) : 0;

  const nextVersion = (reopenFrom?.version ?? 0) + 1;

  const snapshot: PlanillaSnapshot = useMemo(() => ({
    cfg,
    servicio: { id: servicio?.id, nombre: servicio?.nombre, fecha: servicio?.fecha, hora: servicio?.hora },
    totales: { asistentes: presentes.length, personas: personas.length, tasa },
    filas: presentes,
  }), [cfg, servicio, presentes, personas.length, tasa]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const r = newPlanillaRef();
      const h = await computeHash(r, snapshot);
      if (!cancelled) { setRef(r); setHash(h); }
    })();
    return () => { cancelled = true; };
  }, [open, snapshot]);

  const html = useMemo(
    () => renderPlanillaHtml(snapshot, { ref, hash, version: nextVersion }),
    [snapshot, ref, hash, nextVersion]
  );

  const logHistorial = async (formato: "pdf" | "html" | "excel") => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      await supabase.from("planilla_historial").insert({
        servicio_id: servicio.id,
        generada_por: uid,
        generada_por_email: userData.user?.email || null,
        total_asistentes: presentes.length,
        total_personas: personas.length,
        tasa_asistencia: tasa,
        content_ref: ref,
        content_hash: hash,
        formato,
        version: nextVersion,
        parent_id: reopenFrom?.id ?? null,
        snapshot: snapshot as any,
        motivo: reopenFrom ? "Reapertura para firmas/correcciones" : null,
        parametros: {
          titulo: cfg.titulo,
          subtitulo: cfg.subtitulo,
          pie: cfg.pie,
          color: cfg.color,
          mostrar_logo: cfg.mostrarLogo,
          columnas: cfg.columnas,
          servicio_nombre: servicio.nombre,
          servicio_fecha: servicio.fecha,
        },
      } as any);
      qc.invalidateQueries({ queryKey: ["planilla_historial", servicio.id] });
    } catch (e: any) {
      console.error("planilla_historial insert error", e);
    }
  };

  const handlePrint = async () => {
    setSaving(true);
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { setSaving(false); toast.error("Bloqueador de ventanas activo"); return; }
    w.document.write(html + `<script>window.onload=()=>window.print()<\/script>`);
    w.document.close();
    await logHistorial("pdf");
    toast.success(`Planilla v${nextVersion} generada`, { description: `Ref ${ref} · ${presentes.length} asistentes` });
    setSaving(false);
    onOpenChange(false);
  };

  const handleDownload = async () => {
    setSaving(true);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `planilla-v${nextVersion}-${servicio?.nombre || "reunion"}-${servicio?.fecha || ""}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    await logHistorial("html");
    setSaving(false);
  };

  const handleExcel = async () => {
    setSaving(true);
    try {
      const blob = renderPlanillaExcelBlob(snapshot, { ref, hash, version: nextVersion });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `planilla-v${nextVersion}-${servicio?.nombre || "reunion"}-${servicio?.fecha || ""}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      await logHistorial("excel");
      toast.success(`Excel v${nextVersion} generado`, { description: `Ref ${ref}` });
    } catch (e: any) {
      console.error(e);
      toast.error("No se pudo generar el Excel", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Vista previa de la planilla{reopenFrom ? ` · Nueva versión v${nextVersion}` : ""}
          </DialogTitle>
          <DialogDescription>
            {reopenFrom
              ? `Se generará una nueva versión enlazada a la anterior. El historial anterior se conserva intacto.`
              : `Revisa el formato antes de imprimir. Cada exportación incluye una referencia y un hash SHA-256 para verificar integridad.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-md px-2.5 py-1.5 bg-muted/30">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-mono truncate">
            Ref: <b>{ref || "…"}</b> · v{nextVersion} · SHA-256: {hash ? hash.slice(0, 24) + "…" : "generando…"}
          </span>
        </div>

        <div className="rounded-md border overflow-hidden bg-muted/20">
          <iframe title="preview" srcDoc={html} className="w-full h-[520px] bg-white" />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1.5" /> Cerrar
          </Button>
          <Button variant="outline" onClick={handleExcel} disabled={saving || !hash}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={saving || !hash}>
            <FileDown className="h-4 w-4 mr-1.5" /> HTML
          </Button>
          <Button onClick={handlePrint} disabled={saving || !hash}>
            <Printer className="h-4 w-4 mr-1.5" /> {saving ? "Generando..." : "Imprimir / PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
