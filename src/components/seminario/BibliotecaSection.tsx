import { useState } from "react";
import { useRecursos, useUpsertRecurso, useDeleteRecurso, useProgramas, useMateriasSem } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Library, Plus, Pencil, Trash2, Search, FileText, Video, Link as LinkIcon, Music, Upload } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import { useCan } from "@/hooks/useCan";
import { supabase } from "@/integrations/supabase/client";
import { useMiPersona, useMisOfertas, useIsSeminarioStaff } from "@/hooks/useSeminarioStudent";
import { openAsset } from "@/lib/openAsset";
import AssetPreview from "@/components/shared/AssetPreview";

function kindFromTipo(tipo: string, url?: string): "image" | "pdf" | "video" | "audio" | "other" {
  if (tipo === "pdf") return "pdf";
  if (tipo === "video") return "video";
  if (tipo === "audio") return "audio";
  const u = (url || "").toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(u)) return "image";
  if (/\.pdf(\?|$)/.test(u)) return "pdf";
  if (/\.(mp4|webm|mov)(\?|$)/.test(u)) return "video";
  if (/\.(mp3|wav|m4a|ogg)(\?|$)/.test(u)) return "audio";
  return "other";
}

function isExternalLink(url?: string) {
  if (!url) return false;
  try {
    const h = new URL(url).hostname;
    return !/supabase\.(co|in)$/.test(h);
  } catch { return false; }
}

const TIPOS = [
  { v: "pdf", l: "PDF", icon: FileText },
  { v: "video", l: "Video", icon: Video },
  { v: "link", l: "Enlace", icon: LinkIcon },
  { v: "audio", l: "Audio", icon: Music },
];

export default function BibliotecaSection() {
  const can = useCan();
  const canEdit = can("seminario:biblioteca_crud");
  const { data: isStaff } = useIsSeminarioStaff();
  const { data: miPersona } = useMiPersona();
  const { data: misOfertas } = useMisOfertas(miPersona?.id);
  const studentMode = !isStaff && !canEdit;
  const enrolledMateriaIds = new Set((misOfertas || []).map((o: any) => o.materia_id).filter(Boolean));

  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || programas?.[0]?.id || "";
  const { data: allMaterias } = useMateriasSem(effProg);
  const materias = studentMode
    ? (allMaterias || []).filter((m: any) => enrolledMateriaIds.has(m.id))
    : (allMaterias || []);
  const [materiaId, setMateriaId] = useState("");
  const [q, setQ] = useState("");
  const { data: recursos } = useRecursos({ programa_id: effProg || undefined, materia_id: materiaId || undefined });
  const upsert = useUpsertRecurso();
  const del = useDeleteRecurso();
  const [editing, setEditing] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);

  const filtered = (recursos || []).filter((r: any) => {
    if (q && !r.titulo?.toLowerCase().includes(q.toLowerCase())) return false;
    if (studentMode) {
      // Solo recursos de materias matriculadas; oculta recursos "Generales" sin materia
      if (!r.materia_id || !enrolledMateriaIds.has(r.materia_id)) return false;
    }
    return true;
  });

  const handleSave = async (f: any) => {
    try {
      await upsert.mutateAsync({ ...f, programa_id: effProg });
      toast.success("Recurso guardado");
      setEditing(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Library className="h-5 w-5" />Biblioteca Digital</h2>
          <p className="text-xs text-muted-foreground">PDFs, videos, audios y enlaces por materia</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-8 w-44" />
          </div>
          <Select value={effProg} onValueChange={setProgramaId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>{(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={materiaId || "_all"} onValueChange={(v) => setMateriaId(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Materia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas las materias</SelectItem>
              {(materias || []).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.codigo} · {m.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          {canEdit && (
            <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditing({ titulo: "", tipo: "pdf", url: "", descripcion: "", materia_id: null })}>
                  <Plus className="h-4 w-4 mr-1" />Nuevo
                </Button>
              </DialogTrigger>
              {editing && <RecursoDialog data={editing} materias={materias || []} onSave={handleSave} pending={upsert.isPending} />}
            </Dialog>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sin recursos</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r: any) => {
            const Icon = TIPOS.find(t => t.v === r.tipo)?.icon || FileText;
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{r.titulo}</p>
                        <p className="text-[10px] text-muted-foreground">{r.sem_materias?.nombre || "General"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{r.tipo}</Badge>
                  </div>
                  {r.descripcion && <p className="text-xs text-muted-foreground line-clamp-2">{r.descripcion}</p>}
                  <div className="flex gap-1 pt-1">
                    {r.url && (
                      <>
                        {isExternalLink(r.url) || r.tipo === "link" ? (
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(r.url, "_blank", "noopener,noreferrer")}>Abrir</Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreview(r)}>Ver</Button>
                            <Button size="sm" variant="ghost" onClick={() => openAsset({ url: r.url, bucket: "recursos-academicos", filename: r.titulo, download: true })}>Descargar</Button>
                          </>
                        )}
                      </>
                    )}
                    {canEdit && (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <DeleteConfirmDialog onConfirm={async () => { await del.mutateAsync(r.id); toast.success("Eliminado"); }}
                          trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-6">
              <span className="truncate">{preview?.titulo}</span>
              {preview?.url && (
                <Button size="sm" variant="outline" onClick={() => openAsset({ url: preview.url, bucket: "recursos-academicos", filename: preview.titulo, download: true })}>
                  Descargar
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <AssetPreview
              url={preview.url}
              bucket="recursos-academicos"
              kind={kindFromTipo(preview.tipo, preview.url)}
              filename={preview.titulo}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecursoDialog({ data, materias, onSave, pending }: any) {
  const [f, setF] = useState(data);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("El archivo supera 50MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `seminario/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("recursos-academicos").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("recursos-academicos").getPublicUrl(path);
      const inferredTipo =
        file.type.startsWith("video/") ? "video" :
        file.type.startsWith("audio/") ? "audio" :
        file.type === "application/pdf" ? "pdf" : f.tipo || "pdf";
      setF((prev: any) => ({
        ...prev,
        url: pub.publicUrl,
        tipo: prev.tipo || inferredTipo,
        titulo: prev.titulo || file.name.replace(/\.[^.]+$/, ""),
      }));
      toast.success("Archivo subido");
    } catch (e: any) { toast.error(e.message || "Error subiendo archivo"); }
    finally { setUploading(false); }
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{f.id ? "Editar" : "Nuevo"} recurso</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Título *</Label><Input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Materia</Label>
            <Select value={f.materia_id || "_none"} onValueChange={(v) => setF({ ...f, materia_id: v === "_none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="General" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">General</SelectItem>
                {materias.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.codigo} · {m.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Archivo (opcional)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp3,.mp4,.m4a,.wav,.zip,image/*"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(file); }}
              disabled={uploading}
              className="text-xs"
            />
            {uploading && <span className="text-xs text-muted-foreground flex items-center gap-1"><Upload className="h-3 w-3 animate-pulse" />Subiendo…</span>}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">PDF, video, audio o documentos (máx 50MB). Al subir se llena la URL automáticamente.</p>
        </div>
        <div><Label>URL *</Label><Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://... o sube un archivo arriba" /></div>
        <div><Label>Descripción</Label><Textarea value={f.descripcion || ""} onChange={(e) => setF({ ...f, descripcion: e.target.value })} rows={2} /></div>
        <Button disabled={pending || uploading || !f.titulo || !f.url} onClick={() => onSave(f)} className="w-full">
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </DialogContent>
  );
}

