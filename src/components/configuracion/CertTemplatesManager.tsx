import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Star, StarOff, Eye, Trash2, RefreshCw, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useCertTemplates,
  useCreateCertTemplate,
  useUpdateCertTemplate,
  useSetCertTemplateDefault,
  useDeleteCertTemplate,
  CERT_TIPO_LABEL,
  type CertTipo,
  type CertTemplate,
} from "@/hooks/useCertTemplates";
import { clearBrowserTemplateCache, bustCacheUrl } from "@/lib/certTemplateCache";
import { useQueryClient } from "@tanstack/react-query";

const TIPOS: CertTipo[] = ["lideres_cdp", "bautismo", "seminario_diploma", "academia"];

export default function CertTemplatesManager() {
  const qc = useQueryClient();
  const { data: templates, isLoading } = useCertTemplates();
  const setDefault = useSetCertTemplateDefault();
  const update = useUpdateCertTemplate();
  const del = useDeleteCertTemplate();
  const [preview, setPreview] = useState<CertTemplate | null>(null);

  const handleGlobalReload = async () => {
    clearBrowserTemplateCache();
    await qc.invalidateQueries({ queryKey: ["cert-templates"] });
    toast.success("Plantillas recargadas desde el servidor y caché del navegador limpio.");
  };

  if (isLoading) {
    return <div className="h-32 rounded-lg border bg-muted/40 animate-pulse" />;
  }

  const byTipo = TIPOS.reduce((acc, t) => {
    acc[t] = (templates || []).filter((x) => x.tipo === t);
    return acc;
  }, {} as Record<CertTipo, CertTemplate[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Plantillas de certificados</h3>
          <p className="text-sm text-muted-foreground">
            Sube múltiples plantillas por tipo y elige cuál usar en cada descarga.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleGlobalReload}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Forzar recarga global
        </Button>
      </div>

      {TIPOS.map((tipo) => (
        <Card key={tipo}>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{CERT_TIPO_LABEL[tipo]}</CardTitle>
              <CardDescription>{byTipo[tipo].length} plantilla(s)</CardDescription>
            </div>
            <UploadTemplateButton tipo={tipo} />
          </CardHeader>
          <CardContent>
            {byTipo[tipo].length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Aún no hay plantillas para {CERT_TIPO_LABEL[tipo]}.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {byTipo[tipo].map((t) => (
                  <div key={t.id} className="border rounded-lg overflow-hidden bg-card">
                    <div className="aspect-[11/8.5] bg-muted/40 relative">
                      {t.asset_url ? (
                        <img
                          src={bustCacheUrl(t.asset_url, t.version)}
                          alt={t.nombre}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      {t.es_default && (
                        <Badge className="absolute top-2 left-2 bg-primary">Por defecto</Badge>
                      )}
                      {!t.activo && (
                        <Badge variant="secondary" className="absolute top-2 right-2">Inactiva</Badge>
                      )}
                    </div>
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate" title={t.nombre}>{t.nombre}</p>
                        <Badge variant="outline" className="font-mono text-[10px]">v{t.version}</Badge>
                      </div>
                      {t.descripcion && <p className="text-[11px] text-muted-foreground line-clamp-2">{t.descripcion}</p>}
                      <p className="text-[10px] text-muted-foreground font-mono truncate" title={t.asset_id || ""}>
                        asset {(t.asset_id || "").slice(0, 12) || "—"}
                      </p>
                      <div className="flex gap-1 pt-1 flex-wrap">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setPreview(t)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="ghost" className="h-7 px-2"
                          disabled={t.es_default}
                          onClick={() => setDefault.mutate({ id: t.id, tipo: t.tipo }, {
                            onSuccess: () => toast.success("Plantilla marcada por defecto"),
                            onError: (e: any) => toast.error(e.message),
                          })}
                          title="Marcar como plantilla por defecto"
                        >
                          {t.es_default ? <Star className="h-3.5 w-3.5 fill-primary text-primary" /> : <StarOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm" variant="ghost" className="h-7 text-[11px] px-2"
                          onClick={() => update.mutate({ id: t.id, patch: { activo: !t.activo } }, {
                            onSuccess: () => toast.success(t.activo ? "Desactivada" : "Activada"),
                            onError: (e: any) => toast.error(e.message),
                          })}
                        >
                          {t.activo ? "Desactivar" : "Activar"}
                        </Button>
                        <Button
                          size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (!confirm(`¿Eliminar la plantilla "${t.nombre}"?`)) return;
                            del.mutate(t.id, {
                              onSuccess: () => toast.success("Plantilla eliminada"),
                              onError: (e: any) => toast.error(e.message),
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{preview?.nombre} · v{preview?.version}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="rounded-lg overflow-hidden border bg-white">
              <img src={bustCacheUrl(preview.asset_url, preview.version)} alt={preview.nombre} className="w-full h-auto" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UploadTemplateButton({ tipo }: { tipo: CertTipo }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [uploading, setUploading] = useState(false);
  const create = useCreateCertTemplate();

  const handleUpload = async () => {
    if (!file) { toast.error("Selecciona un archivo"); return; }
    if (!nombre.trim()) { toast.error("Ponle un nombre a la plantilla"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${tipo}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("cert-templates").upload(path, file, {
        contentType: file.type || "image/png",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("cert-templates").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      const url = signed?.signedUrl || "";
      await create.mutateAsync({
        tipo,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        asset_id: path,
        asset_url: url,
        asset_filename: file.name,
        asset_size: file.size,
        storage_bucket: "cert-templates",
        storage_path: path,
        preview_url: url,
      });
      toast.success("Plantilla subida");
      setOpen(false);
      setFile(null); setNombre(""); setDescripcion("");
    } catch (e: any) {
      toast.error("Error subiendo plantilla", { description: e.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-1.5" /> Subir plantilla
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva plantilla · {CERT_TIPO_LABEL[tipo]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Diseño 2026 oficial" />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Notas opcionales" />
            </div>
            <div>
              <Label>Archivo (PNG/JPG, orientación horizontal recomendada)</Label>
              <Input
                ref={fileRef} type="file" accept="image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && <p className="text-[11px] text-muted-foreground mt-1">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
