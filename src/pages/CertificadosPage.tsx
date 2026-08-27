import { useMemo, useState } from "react";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import CertificadoIglesiaFormDialog from "@/components/forms/CertificadoIglesiaFormDialog";
import { useCertificadosIglesia, useDeleteCertificadoIglesia } from "@/hooks/useCertificadosIglesia";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Download, Search, LayoutGrid, Rows, X, Plus, Calendar, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import ModuleHero from "@/components/shell/ModuleHero";
import PageSkeleton from "@/components/shared/PageSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import certLideresAsset from "@/assets/cert-lideres-cdp.png.asset.json";
import certBautismoAsset from "@/assets/cert-bautismo.png.asset.json";
import CertDownloadDialog from "@/components/certificados/CertDownloadDialog";
import { logCertExport } from "@/lib/logCertExport";

const TIPO_META: Record<string, { color: string; bg: string; ring: string }> = {
  "Membresía":              { color: "#3b82f6", bg: "from-blue-500/10 to-blue-500/5", ring: "ring-blue-500/30" },
  "Bautismo":               { color: "#06b6d4", bg: "from-cyan-500/10 to-cyan-500/5", ring: "ring-cyan-500/30" },
  "Líderes de Casas de Paz":{ color: "#c9a24a", bg: "from-amber-500/10 to-amber-500/5", ring: "ring-amber-500/30" },
  "Confirmación":           { color: "#22c55e", bg: "from-emerald-500/10 to-emerald-500/5", ring: "ring-emerald-500/30" },
  "Matrimonio":             { color: "#f59e0b", bg: "from-amber-500/10 to-amber-500/5", ring: "ring-amber-500/30" },
  "Presentación de niños":  { color: "#a855f7", bg: "from-purple-500/10 to-purple-500/5", ring: "ring-purple-500/30" },
  "Donación":               { color: "#64748b", bg: "from-slate-500/10 to-slate-500/5", ring: "ring-slate-500/30" },
  "Carta de transferencia": { color: "#ef4444", bg: "from-rose-500/10 to-rose-500/5", ring: "ring-rose-500/30" },
  "Curso":                  { color: "#8b5cf6", bg: "from-violet-500/10 to-violet-500/5", ring: "ring-violet-500/30" },
};
const tipoMeta = (t: string) => TIPO_META[t] || { color: "#6b7280", bg: "from-gray-500/10 to-gray-500/5", ring: "ring-gray-500/30" };

/** Plantillas oficiales (imágenes de fondo). El nombre se dibuja sobre la línea. */
const TEMPLATE_MAP: Record<string, string> = {
  "Bautismo": certBautismoAsset.url,
  "Líderes de Casas de Paz": certLideresAsset.url,
};

async function loadImageDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: "cors" });
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function generateCertificatePDF(cert: any, config: any, overrideTemplateUrl?: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  const templateUrl = overrideTemplateUrl || TEMPLATE_MAP[cert.tipo];
  if (templateUrl) {
    // ===== Plantilla oficial CMG / FEL Institute =====
    try {
      const dataUrl = await loadImageDataUrl(templateUrl);
      doc.addImage(dataUrl, "PNG", 0, 0, w, h, undefined, "FAST");

      // Nombre del líder / miembro sobre la línea horizontal de la plantilla.
      // Coordenadas calibradas a las plantillas subidas (letter landscape).
      doc.setFont("times", "italic");
      doc.setTextColor(30, 30, 30);
      const nameY = cert.tipo === "Bautismo" ? 170 : 175;
      // Ajuste automático de tamaño según longitud del nombre
      const nombre = cert.personaNombre || "—";
      let fontSize = 26;
      if (nombre.length > 28) fontSize = 22;
      if (nombre.length > 38) fontSize = 18;
      doc.setFontSize(fontSize);
      doc.text(nombre, w / 2, nameY, { align: "center" });

      // Código y fecha discretos en el pie
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      const fechaStr = cert.fecha_emision ? format(parseISO(cert.fecha_emision), "dd/MM/yyyy") : "";
      doc.text(`Código de verificación: ${cert.codigo}   ·   Emitido: ${fechaStr}`, w / 2, h - 5, { align: "center" });

      doc.save(`Certificado_${nombre.replace(/\s/g, "_")}_${cert.tipo}.pdf`);
      return;
    } catch (e) {
      // Si la plantilla falla, seguimos con el diseño genérico.
      console.warn("No se pudo cargar la plantilla, usando diseño genérico", e);
    }
  }

  // ===== Diseño genérico (resto de tipos o fallback) =====
  doc.setDrawColor(59, 130, 246); doc.setLineWidth(2); doc.rect(10, 10, w - 20, h - 20);
  doc.setLineWidth(0.5); doc.rect(14, 14, w - 28, h - 28);
  doc.setFontSize(28); doc.setFont("helvetica", "bold"); doc.setTextColor(59, 130, 246);
  doc.text("CERTIFICADO", w / 2, 40, { align: "center" });
  doc.setFontSize(16); doc.setTextColor(100, 100, 100); doc.text(`de ${cert.tipo}`, w / 2, 52, { align: "center" });
  doc.setFontSize(12); doc.setTextColor(80, 80, 80);
  doc.text(config?.nombre_iglesia || "Iglesia", w / 2, 65, { align: "center" });
  doc.setFontSize(12); doc.setTextColor(100, 100, 100);
  doc.text("Se otorga el presente certificado a:", w / 2, 82, { align: "center" });
  doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text(cert.personaNombre, w / 2, 96, { align: "center" });
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.line(w / 2 - 60, 100, w / 2 + 60, 100);
  doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  const fechaStr = cert.fecha_emision ? format(parseISO(cert.fecha_emision), "dd/MM/yyyy") : "";
  doc.text(`Fecha de expedición: ${fechaStr}`, w / 2, 112, { align: "center" });
  doc.setFontSize(9); doc.text(`Código: ${cert.codigo}`, w / 2, 120, { align: "center" });
  if (config?.pastor_principal) {
    doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
    doc.line(w / 2 - 40, 145, w / 2 + 40, 145);
    doc.text(config.pastor_principal, w / 2, 152, { align: "center" });
    doc.setFontSize(9); doc.text("Pastor Principal", w / 2, 158, { align: "center" });
  }
  doc.save(`Certificado_${cert.personaNombre.replace(/\s/g, "_")}_${cert.tipo}.pdf`);
}

/** Diploma visual (preview en vivo) */
function DiplomaPreview({ cert, config, scale = "sm" }: { cert: any; config: any; scale?: "sm" | "lg" }) {
  const meta = tipoMeta(cert.tipo);
  const isLg = scale === "lg";
  const templateUrl = TEMPLATE_MAP[cert.tipo];

  // ===== Vista previa con plantilla oficial (Bautismo / Líderes CDP) =====
  if (templateUrl) {
    return (
      <div className="relative w-full aspect-[11/8.5] rounded-lg overflow-hidden border shadow-sm bg-white">
        <img
          src={templateUrl}
          alt={`Plantilla ${cert.tipo}`}
          className="absolute inset-0 w-full h-full object-cover select-none"
          loading="lazy"
          decoding="async"
        />
        {/* Nombre sobre la línea de la plantilla — posición proporcional */}
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none"
          style={{ top: cert.tipo === "Bautismo" ? "78%" : "80%" }}
        >
          <p
            className={cn(
              "font-serif italic text-foreground/90 px-3 truncate max-w-[70%] text-center",
              isLg ? "text-xl md:text-2xl" : "text-[10px]"
            )}
          >
            {cert.personaNombre || "—"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full aspect-[11/8.5] rounded-lg overflow-hidden bg-gradient-to-br border-2 shadow-sm",
        meta.bg
      )}
      style={{ borderColor: meta.color + "55" }}
    >
      {/* Marco interno */}
      <div
        className="absolute rounded-md"
        style={{
          inset: isLg ? "14px" : "6px",
          border: `1px solid ${meta.color}44`,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <p
          className={cn("font-bold tracking-[0.2em] uppercase", isLg ? "text-2xl" : "text-[9px]")}
          style={{ color: meta.color }}
        >
          Certificado
        </p>
        <p className={cn("text-muted-foreground", isLg ? "text-sm mt-1" : "text-[6.5px] mt-0.5")}>
          de {cert.tipo}
        </p>
        <div
          className={cn("h-px my-1", isLg ? "w-40 my-3" : "w-14")}
          style={{ background: meta.color + "66" }}
        />
        <p className={cn("text-muted-foreground", isLg ? "text-xs" : "text-[6px]")}>Otorgado a</p>
        <p className={cn("font-serif font-bold text-foreground mt-1 line-clamp-2", isLg ? "text-3xl" : "text-[10.5px] leading-tight")}>
          {cert.personaNombre || "—"}
        </p>
        {isLg && (
          <p className="text-xs text-muted-foreground mt-3 max-w-md">
            {config?.nombre_iglesia || "Iglesia"} certifica el presente reconocimiento.
          </p>
        )}
        <div className={cn("flex items-center gap-3 text-muted-foreground", isLg ? "text-[11px] mt-6" : "text-[5.5px] mt-1")}>
          <span className="flex items-center gap-1"><Calendar className={isLg ? "h-3 w-3" : "h-1.5 w-1.5"} /> {cert.fecha_emision ? format(parseISO(cert.fecha_emision), "dd MMM yyyy", { locale: es }) : "—"}</span>
          <span className="flex items-center gap-1"><Hash className={isLg ? "h-3 w-3" : "h-1.5 w-1.5"} /> {cert.codigo}</span>
        </div>
      </div>
      {/* Sello */}
      <div
        className={cn("absolute rounded-full flex items-center justify-center", isLg ? "bottom-4 right-4 h-14 w-14" : "bottom-1 right-1 h-5 w-5")}
        style={{ background: meta.color + "22", border: `1.5px solid ${meta.color}` }}
      >
        <Award className={cn(isLg ? "h-6 w-6" : "h-2.5 w-2.5")} style={{ color: meta.color }} />
      </div>
    </div>
  );
}

export default function CertificadosPage() {
  const { data: certificados, isLoading } = useCertificadosIglesia();
  const { data: config } = useConfiguracion();
  const deleteCert = useDeleteCertificadoIglesia();

  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [selected, setSelected] = useState<any>(null);
  const [downloadCert, setDownloadCert] = useState<any>(null);
  const downloadTipoKey: "bautismo" | "lideres_cdp" | null =
    downloadCert?.tipo === "Bautismo" ? "bautismo"
    : downloadCert?.tipo === "Líderes de Casas de Paz" ? "lideres_cdp"
    : null;

  const certs = useMemo(
    () => (certificados || []).map((c: any) => ({
      ...c,
      personaNombre: `${c.personas?.nombres || ""} ${c.personas?.apellidos || ""}`.trim(),
      tipo: c.tipo_certificado || "Curso",
    })),
    [certificados]
  );

  const tipoCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const c of certs) acc[c.tipo] = (acc[c.tipo] || 0) + 1;
    return acc;
  }, [certs]);

  const filtered = useMemo(() => {
    return certs.filter((c) => {
      if (tipoFilter !== "all" && c.tipo !== tipoFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.personaNombre.toLowerCase().includes(q) ||
        c.tipo.toLowerCase().includes(q) ||
        c.codigo.toLowerCase().includes(q)
      );
    });
  }, [certs, tipoFilter, search]);

  if (isLoading) {
    return (
      <PageSkeleton variant="list" />
    );
  }

  const handleDelete = async (id: string) => {
    await deleteCert.mutateAsync(id);
    toast.success("Certificado eliminado");
    if (selected?.id === id) setSelected(null);
  };
  const handleDownload = async (cert: any) => {
    // Para tipos con plantilla configurable, abrir el diálogo con selector + vista previa
    if (cert.tipo === "Bautismo" || cert.tipo === "Líderes de Casas de Paz") {
      setDownloadCert(cert);
      return;
    }
    try {
      await generateCertificatePDF(cert, config);
      await logCertExport({
        tipo: "academia",
        template: null,
        persona_id: cert.persona_id,
        contexto: { codigo: cert.codigo, tipo_original: cert.tipo, persona_nombre: cert.personaNombre },
      });
      toast.success("Certificado descargado");
    } catch (e: any) {
      toast.error("No se pudo generar el PDF", { description: e?.message });
    }
  };

  const exportData = filtered.map((c) => ({
    miembro: c.personaNombre, tipo: c.tipo,
    fecha: c.fecha_emision, codigo: c.codigo,
  }));

  const tiposDisponibles = Object.keys(TIPO_META);

  return (
    <div className="animate-fade-in -m-3 md:-m-6 flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Rail izquierdo */}
      <aside className="w-60 shrink-0 border-r bg-card/40 hidden md:flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b">
          <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">Emisión</p>
          <h2 className="text-sm font-semibold mt-0.5">Certificados</h2>
        </div>
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Miembro, tipo o código…" className="pl-8 h-8 text-[13px]" />
          </div>
        </div>
        <div className="py-2">
          <p className="px-4 pt-1 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo</p>
          <button
            onClick={() => setTipoFilter("all")}
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-1.5 text-[13px]",
              tipoFilter === "all" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            <Award className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Todos</span>
            <span className="text-[10.5px]">{certs.length}</span>
          </button>
          {tiposDisponibles.map((t) => {
            const active = tipoFilter === t;
            const m = tipoMeta(t);
            const count = tipoCounts[t] || 0;
            return (
              <button
                key={t}
                onClick={() => setTipoFilter(t)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-1.5 text-[13px]",
                  active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/60",
                  count === 0 && "opacity-60"
                )}
              >
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                <span className="flex-1 text-left truncate">{t}</span>
                <span className="text-[10.5px]">{count}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 p-3 md:p-6 space-y-5 overflow-y-auto h-full">
        <ModuleHero
          variant="certificados"
          title={tipoFilter === "all" ? "Todos los certificados" : tipoFilter}
          eyebrow={`${filtered.length} de ${certs.length}`}
          description="Emisión, verificación pública y descarga PDF de constancias con sello institucional."
          status={{ label: "Firma digital activa", tone: "ok" }}
          kpis={[
            { label: "Emitidos totales", value: certs.length, hint: "Histórico", tone: "info" },
            { label: "Este año", value: certs.filter((c: any) => (c.fecha_emision || "").startsWith(String(new Date().getFullYear()))).length, hint: "Año en curso", tone: "ok" },
            { label: "Tipos activos", value: Object.keys(tipoCounts).length, hint: "Categorías con emisión", tone: "warn" },
            { label: "Filtrados", value: filtered.length, hint: "Vista actual", tone: "info" },
          ]}
          actions={
            <>
              <div className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5">
                {[
                  { id: "grid", icon: LayoutGrid, label: "Galería" },
                  { id: "table", icon: Rows, label: "Tabla" },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setView(v.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] transition-colors",
                      view === v.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <v.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                ))}
              </div>
              <ExportDropdown
                title="Certificados"
                filename="certificados"
                columns={[
                  { header: "Miembro", key: "miembro" }, { header: "Tipo", key: "tipo" },
                  { header: "Fecha expedición", key: "fecha" }, { header: "Código", key: "codigo" },
                ]}
                data={exportData}
              />
              <CertificadoIglesiaFormDialog />
            </>
          }
        />


        {/* Mobile filter chips */}
        <div className="md:hidden -mx-3 px-3 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            <button
              onClick={() => setTipoFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border",
                tipoFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card"
              )}
            >
              Todos {certs.length}
            </button>
            {tiposDisponibles.map((t) => (
              <button
                key={t}
                onClick={() => setTipoFilter(t)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs whitespace-nowrap border",
                  tipoFilter === t ? "bg-primary text-primary-foreground border-primary" : "bg-card"
                )}
              >
                {t} {tipoCounts[t] || 0}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <EmptyState
            icon={Award}
            title="No se encontraron certificados"
            description={search || tipoFilter !== "all" ? "Ajusta la búsqueda o el filtro de tipo." : "Emite el primer certificado para verlo aquí."}
            action={<CertificadoIglesiaFormDialog />}
          />
        )}


        {view === "grid" && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const meta = tipoMeta(c.tipo);
              return (
                <div
                  key={c.id}
                  className={cn(
                    "group rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md cursor-pointer",
                    selected?.id === c.id && "ring-2 " + meta.ring
                  )}
                  onClick={() => setSelected(c)}
                >
                  <div className="p-3">
                    <DiplomaPreview cert={c} config={config} scale="sm" />
                  </div>
                  <div className="px-4 pb-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{c.personaNombre}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {c.fecha_emision ? format(parseISO(c.fecha_emision), "dd MMM yyyy", { locale: es }) : "—"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1.5 shrink-0"
                        style={{ color: meta.color, borderColor: meta.color + "66" }}
                      >
                        {c.tipo}
                      </Badge>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1"
                        onClick={(e) => { e.stopPropagation(); handleDownload(c); }}
                      >
                        <Download className="h-3 w-3" /> PDF
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DeleteConfirmDialog
                          onConfirm={() => handleDelete(c.id)}
                          title="¿Eliminar certificado?"
                          description={`Se eliminará el certificado de "${c.personaNombre}" permanentemente.`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "table" && filtered.length > 0 && (
          <div className="bg-card border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Miembro</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha expedición</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, i) => {
                  const meta = tipoMeta(c.tipo);
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{c.personaNombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]" style={{ color: meta.color, borderColor: meta.color + "66" }}>
                          {c.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.fecha_emision ? format(parseISO(c.fecha_emision), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.codigo}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleDownload(c)}>
                            <Download className="h-3.5 w-3.5" /> PDF
                          </Button>
                          <DeleteConfirmDialog
                            onConfirm={() => handleDelete(c.id)}
                            title="¿Eliminar certificado?"
                            description={`Se eliminará el certificado de "${c.personaNombre}" permanentemente.`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Preview lateral en vivo */}
      {selected && (
        <aside className="hidden lg:flex fixed right-0 top-14 bottom-0 w-[440px] border-l bg-background shadow-xl flex-col z-20 animate-in slide-in-from-right">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">Preview</p>
              <h3 className="font-semibold text-sm">{selected.personaNombre}</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <DiplomaPreview cert={selected} config={config} scale="lg" />
            <div className="rounded-lg border bg-card/50 p-3 space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="font-medium">{selected.tipo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fecha</span><span className="font-medium">{selected.fecha_emision ? format(parseISO(selected.fecha_emision), "dd MMM yyyy", { locale: es }) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Código</span><span className="font-mono text-xs">{selected.codigo}</span></div>
            </div>
          </div>
          <div className="p-4 border-t flex gap-2">
            <Button className="flex-1 gap-1.5" onClick={() => handleDownload(selected)}>
              <Download className="h-4 w-4" /> Descargar PDF
            </Button>
            <DeleteConfirmDialog
              onConfirm={() => handleDelete(selected.id)}
              title="¿Eliminar certificado?"
              description={`Se eliminará el certificado de "${selected.personaNombre}" permanentemente.`}
            />
          </div>
        </aside>
      )}

      {downloadCert && downloadTipoKey && (
        <CertDownloadDialog
          open={!!downloadCert}
          onOpenChange={(v) => !v && setDownloadCert(null)}
          tipo={downloadTipoKey}
          personaId={downloadCert.persona_id}
          personaNombre={downloadCert.personaNombre}
          contexto={{ codigo: downloadCert.codigo, tipo_original: downloadCert.tipo }}
          onDownload={async (template) => {
            await generateCertificatePDF(downloadCert, config, template?.asset_url);
          }}
        />
      )}
    </div>
  );
}
