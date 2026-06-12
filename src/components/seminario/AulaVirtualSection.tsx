import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useProgramas, usePeriodos, useOfertas, useCalificacionesMatriz, useEvaluaciones, useRecursos,
  useAnuncios, useUpsertAnuncio, useDeleteAnuncio, useUpsertRecurso, useDeleteRecurso,
  useUpsertEvaluacion, useDeleteEvaluacion,
} from "@/hooks/useSeminario";
import { supabase } from "@/integrations/supabase/client";
import { useForos, useCrearForo, useForoMensajes, useEnviarMensajeForo, useEliminarMensajeForo, useToggleForoCerrado, useIsSeminarioStaff } from "@/hooks/useSeminarioStudent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  Video, Megaphone, Plus, Trash2, FileText, Calendar, User, Clock, MapPin, Eye, Settings,
  Upload, ClipboardList, BarChart3, UserCheck, MessageSquare, Download, Lock, Unlock,
  ChevronLeft, ChevronRight, Search, Send,
} from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import { useCan } from "@/hooks/useCan";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/hooks/useAuth";
import MiAulaSection from "./MiAulaSection";

const sb = supabase as any;
function fmtDateTime(d?: string) { return d ? new Date(d).toLocaleString("es-CO") : "—"; }

export default function AulaVirtualSection() {
  const { roles, isLoading: rolesLoading } = useUserRoles() as any;
  const isStaff = (roles || []).some((r: string) => ["admin", "super_admin", "pastor", "seminario_admin", "maestro"].includes(r));
  const [previewStudent, setPreviewStudent] = useState(false);

  if (rolesLoading) {
    return <div className="space-y-3"><div className="h-8 w-64 bg-muted animate-pulse rounded" /><div className="h-32 bg-muted animate-pulse rounded" /></div>;
  }
  if (!isStaff) return <MiAulaSection />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="inline-flex rounded-md border bg-card p-0.5">
          <Button size="sm" variant={previewStudent ? "ghost" : "default"} onClick={() => setPreviewStudent(false)}>
            <Settings className="h-3.5 w-3.5 mr-1" />Vista docente
          </Button>
          <Button size="sm" variant={previewStudent ? "default" : "ghost"} onClick={() => setPreviewStudent(true)}>
            <Eye className="h-3.5 w-3.5 mr-1" />Vista estudiante
          </Button>
        </div>
      </div>
      {previewStudent ? <MiAulaSection /> : <AulaVirtualStaff />}
    </div>
  );
}

function AulaVirtualStaff() {
  const can = useCan();
  const canAnuncio = can("seminario:anuncios_crud");
  const [, setParams] = useSearchParams();
  const jump = (tab: string) => { const np = new URLSearchParams(window.location.search); np.set("tab", tab); setParams(np); };

  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || programas?.[0]?.id || "";
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useState("");
  const effPer = periodoId || periodos?.[0]?.id || "";
  const { data: ofertas } = useOfertas(effPer, effProg);
  const [ofertaId, setOfertaId] = useState("");
  const effOf = ofertaId || (ofertas as any[])?.[0]?.id || "";
  const ofertaSel = (ofertas as any[] || []).find((o: any) => o.id === effOf);

  const { data: matriz } = useCalificacionesMatriz(effOf);
  const { data: evals } = useEvaluaciones(effOf);
  const { data: recursos } = useRecursos({ materia_id: ofertaSel?.materia_id });
  const { data: anuncios } = useAnuncios(effOf);
  const upsertAnuncio = useUpsertAnuncio();
  const delAnuncio = useDeleteAnuncio();
  const [editAn, setEditAn] = useState<any>(null);

  const saveAnuncio = async (f: any) => {
    try {
      await upsertAnuncio.mutateAsync({ ...f, oferta_id: effOf });
      toast.success("Anuncio guardado");
      setEditAn(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Aula Virtual · Docente</h2>
          <p className="text-xs text-muted-foreground">Material, trabajos, notas, asistencia, anuncios y foros</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={effProg} onValueChange={setProgramaId}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>{(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effPer} onValueChange={setPeriodoId}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>{(periodos || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effOf} onValueChange={setOfertaId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Materia" /></SelectTrigger>
            <SelectContent>
              {(ofertas as any[] || []).map((o: any) => (
                <SelectItem key={o.id} value={o.id}>{o.sem_materias?.codigo} · {o.sem_materias?.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!ofertaSel ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Selecciona una materia.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4 space-y-3" style={{ borderLeft: `4px solid ${ofertaSel.sem_materias?.color || "#3b82f6"}` }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-semibold">{ofertaSel.sem_materias?.nombre}</h3>
                  <p className="text-xs text-muted-foreground">{ofertaSel.sem_materias?.codigo} · {ofertaSel.sem_materias?.creditos} créditos</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {ofertaSel.modalidad && <Badge variant="outline">{ofertaSel.modalidad}</Badge>}
                  {ofertaSel.zoom_link && (
                    <Button size="sm" variant="default" asChild>
                      <a href={ofertaSel.zoom_link} target="_blank" rel="noopener noreferrer">
                        <Video className="h-4 w-4 mr-1" />Unirse Zoom
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{ofertaSel.docente_nombre || "Sin docente"}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ofertaSel.horario || "Sin horario"}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ofertaSel.aula || "Sin aula"}</span>
              </div>
              {/* Accesos directos */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => jump("calificaciones")}><BarChart3 className="h-3.5 w-3.5 mr-1" />Notas</Button>
                <Button size="sm" variant="outline" onClick={() => jump("asistencia")}><UserCheck className="h-3.5 w-3.5 mr-1" />Asistencia</Button>
                <Button size="sm" variant="outline" onClick={() => jump("biblioteca")}><FileText className="h-3.5 w-3.5 mr-1" />Biblioteca</Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="material">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="material"><FileText className="h-3.5 w-3.5 mr-1" />Material ({recursos?.length || 0})</TabsTrigger>
              <TabsTrigger value="trabajos"><ClipboardList className="h-3.5 w-3.5 mr-1" />Trabajos ({evals?.length || 0})</TabsTrigger>
              <TabsTrigger value="estudiantes"><User className="h-3.5 w-3.5 mr-1" />Estudiantes ({matriz?.estudiantes?.length || 0})</TabsTrigger>
              <TabsTrigger value="anuncios"><Megaphone className="h-3.5 w-3.5 mr-1" />Anuncios ({anuncios?.length || 0})</TabsTrigger>
              <TabsTrigger value="foros"><MessageSquare className="h-3.5 w-3.5 mr-1" />Foros</TabsTrigger>
            </TabsList>

            {/* MATERIAL */}
            <TabsContent value="material" className="space-y-2">
              <MaterialTab materiaId={ofertaSel.materia_id} periodoId={ofertaSel.periodo_id} recursos={recursos || []} />
            </TabsContent>

            {/* TRABAJOS */}
            <TabsContent value="trabajos" className="space-y-2">
              <TrabajosTab ofertaId={effOf} evals={evals || []} />
            </TabsContent>

            {/* ESTUDIANTES */}
            <TabsContent value="estudiantes" className="space-y-1">
              {!matriz?.estudiantes?.length ? (
                <p className="text-sm text-muted-foreground p-4 text-center">Sin estudiantes matriculados</p>
              ) : matriz.estudiantes.map((im: any) => {
                const p = im.sem_inscripciones?.personas;
                return (
                  <div key={im.id} className="flex items-center gap-2 p-2 border rounded">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">{p?.nombres?.[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p?.nombres} {p?.apellidos}</p>
                      <p className="text-[10px] text-muted-foreground">{p?.documento}</p>
                    </div>
                    {im.nota_final !== null && (
                      <Badge variant={im.nota_final >= 3 ? "default" : "destructive"}>{Number(im.nota_final).toFixed(2)}</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">{im.estado}</Badge>
                  </div>
                );
              })}
            </TabsContent>

            {/* ANUNCIOS */}
            <TabsContent value="anuncios" className="space-y-2">
              {canAnuncio && (
                <Dialog open={!!editAn} onOpenChange={(v) => !v && setEditAn(null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => setEditAn({ titulo: "", mensaje: "" })}>
                      <Plus className="h-4 w-4 mr-1" />Nuevo anuncio
                    </Button>
                  </DialogTrigger>
                  {editAn && (
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nuevo anuncio</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Título *</Label><Input value={editAn.titulo} onChange={(e) => setEditAn({ ...editAn, titulo: e.target.value })} /></div>
                        <div><Label>Mensaje *</Label><Textarea rows={5} value={editAn.mensaje} onChange={(e) => setEditAn({ ...editAn, mensaje: e.target.value })} /></div>
                        <Button onClick={() => saveAnuncio(editAn)} disabled={!editAn.titulo || !editAn.mensaje || upsertAnuncio.isPending} className="w-full">
                          Publicar
                        </Button>
                      </div>
                    </DialogContent>
                  )}
                </Dialog>
              )}
              {!anuncios?.length ? (
                <p className="text-sm text-muted-foreground p-4 text-center">Sin anuncios</p>
              ) : anuncios.map((a: any) => (
                <Card key={a.id}>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-primary" />
                        <p className="font-medium text-sm">{a.titulo}</p>
                      </div>
                      {canAnuncio && (
                        <DeleteConfirmDialog onConfirm={async () => { await delAnuncio.mutateAsync(a.id); toast.success("Eliminado"); }}
                          trigger={<Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>} />
                      )}
                    </div>
                    <p className="text-xs whitespace-pre-wrap">{a.mensaje}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDateTime(a.created_at)}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* FOROS */}
            <TabsContent value="foros">
              <StaffForosTab ofertaId={effOf} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// ════════════ MATERIAL (Recursos) ════════════
function MaterialTab({ materiaId, periodoId, recursos }: { materiaId?: string; periodoId?: string; recursos: any[] }) {
  const upsert = useUpsertRecurso();
  const del = useDeleteRecurso();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitulo(""); setDescripcion(""); setTipo("pdf"); setFile(null); setUrl(""); };

  const handleSave = async () => {
    if (!titulo || !materiaId) { toast.error("Falta título o materia"); return; }
    setBusy(true);
    try {
      let storage_path: string | null = null;
      let publicUrl: string | null = url || null;
      if (file) {
        if (file.size > 50 * 1024 * 1024) throw new Error("Máximo 50MB");
        const ext = file.name.split(".").pop() || "bin";
        const path = `${materiaId}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("recursos-academicos").upload(path, file, { upsert: true, contentType: file.type });
        if (up.error) throw up.error;
        storage_path = path;
        const { data: pub } = supabase.storage.from("recursos-academicos").getPublicUrl(path);
        publicUrl = pub?.publicUrl || null;
      }
      await upsert.mutateAsync({
        materia_id: materiaId,
        periodo_id: periodoId || null,
        titulo, descripcion: descripcion || null,
        tipo, url: publicUrl, storage_path, publicado: true,
      });
      toast.success("Material publicado");
      setOpen(false); reset();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button size="sm"><Upload className="h-3.5 w-3.5 mr-1" />Subir material</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Subir material de clase</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título *</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
              <div><Label>Descripción</Label><Textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="documento">Documento</SelectItem>
                      <SelectItem value="presentacion">Presentación</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="enlace">Enlace</SelectItem>
                      <SelectItem value="imagen">Imagen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>URL externa (opcional)</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
              </div>
              <div>
                <Label>Archivo (máx 50MB)</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <p className="text-[10px] text-muted-foreground mt-1">Sube un archivo o pega un enlace externo. Disponible para estudiantes del curso y periodo.</p>
              </div>
              <Button onClick={handleSave} disabled={!titulo || busy} className="w-full">
                {busy ? "Subiendo..." : "Publicar material"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {!recursos?.length ? (
        <p className="text-sm text-muted-foreground p-4 text-center">Sin material publicado para esta materia</p>
      ) : recursos.map((r: any) => (
        <div key={r.id} className="flex items-center gap-2 p-2 border rounded bg-card">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{r.titulo}</p>
            <p className="text-[10px] text-muted-foreground">{r.tipo}{r.descripcion ? ` · ${r.descripcion}` : ""}</p>
          </div>
          {r.url && <Button size="sm" variant="outline" asChild><a href={r.url} target="_blank" rel="noopener noreferrer"><Download className="h-3 w-3 mr-1" />Abrir</a></Button>}
          <DeleteConfirmDialog onConfirm={async () => { await del.mutateAsync(r.id); toast.success("Eliminado"); }}
            trigger={<Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>} />
        </div>
      ))}
    </div>
  );
}

// ════════════ TRABAJOS (Evaluaciones + Entregas) ════════════
function TrabajosTab({ ofertaId, evals }: { ofertaId: string; evals: any[] }) {
  const upsert = useUpsertEvaluacion();
  const del = useDeleteEvaluacion();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ nombre: "", tipo: "trabajo", peso: 10, fecha: "", descripcion: "" });
  const reset = () => setForm({ nombre: "", tipo: "trabajo", peso: 10, fecha: "", descripcion: "" });

  const save = async () => {
    if (!form.nombre) { toast.error("Nombre requerido"); return; }
    try {
      await upsert.mutateAsync({ ...form, oferta_id: ofertaId, peso: Number(form.peso) });
      toast.success("Trabajo creado");
      setOpen(false); reset();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Crear trabajo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo trabajo / evaluación</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre *</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
              <div><Label>Descripción / instrucciones</Label><Textarea rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trabajo">Trabajo</SelectItem>
                      <SelectItem value="parcial">Parcial</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="participacion">Participación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Peso (%)</Label><Input type="number" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} /></div>
                <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
              </div>
              <Button onClick={save} disabled={!form.nombre || upsert.isPending} className="w-full">Crear</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {!evals?.length ? (
        <p className="text-sm text-muted-foreground p-4 text-center">Sin trabajos creados</p>
      ) : evals.map((e: any) => <EvalRow key={e.id} ev={e} onDelete={async () => { await del.mutateAsync(e.id); toast.success("Eliminado"); }} />)}
    </div>
  );
}

function EvalRow({ ev, onDelete }: { ev: any; onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ClipboardList className="h-4 w-4 text-primary" />
          <p className="font-medium text-sm flex-1">{ev.nombre}</p>
          <Badge variant="outline" className="text-[10px]">{ev.tipo}</Badge>
          <Badge variant="secondary" className="text-[10px]">{ev.peso}%</Badge>
          <Badge variant="outline" className="text-[10px]"><Calendar className="h-3 w-3 mr-1" />{ev.fecha || "sin fecha"}</Badge>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Eye className="h-3 w-3 mr-1" />Entregas</Button>
          <DeleteConfirmDialog onConfirm={onDelete}
            trigger={<Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>} />
        </div>
        {ev.descripcion && <p className="text-xs text-muted-foreground mt-2">{ev.descripcion}</p>}
        <EntregasDialog open={open} onOpenChange={setOpen} evaluacion={ev} />
      </CardContent>
    </Card>
  );
}

function EntregasDialog({ open, onOpenChange, evaluacion }: any) {
  const qkey = ["entregas-eval", evaluacion.id, open];
  const [entregas, setEntregas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await sb.from("sem_entregas")
        .select(`*, sem_inscripcion_materias!inner(sem_inscripciones!inner(personas(nombres, apellidos, documento)))`)
        .eq("evaluacion_id", evaluacion.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEntregas(data || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useMemo(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, qkey.join(",")]);

  const setEstado = async (id: string, estado: string, retro?: string) => {
    try {
      const payload: any = { estado };
      if (retro !== undefined) payload.retroalimentacion = retro;
      const { error } = await sb.from("sem_entregas").update(payload).eq("id", id);
      if (error) throw error;
      toast.success("Actualizado");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Entregas · {evaluacion.nombre}</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {loading ? <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p> :
            !entregas.length ? <p className="text-sm text-muted-foreground py-6 text-center">Sin entregas todavía</p> :
            entregas.map((e: any) => {
              const p = e.sem_inscripcion_materias?.sem_inscripciones?.personas;
              return (
                <Card key={e.id}><CardContent className="p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium flex-1">{p?.nombres} {p?.apellidos}</p>
                    <Badge variant="outline" className="text-[10px]">v{e.version || 1}</Badge>
                    <Badge variant={e.estado === "calificada" ? "default" : "secondary"} className="text-[10px]">{(e.estado || "").replace("_", " ")}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Enviada: {fmtDateTime(e.created_at)}</p>
                  {e.archivo_url && (
                    <a href={e.archivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate block">
                      <Download className="h-3 w-3 inline mr-1" />{e.archivo_nombre}
                    </a>
                  )}
                  {e.comentario && <p className="text-xs"><span className="font-medium">Comentario alumno: </span>{e.comentario}</p>}
                  <Textarea rows={2} placeholder="Retroalimentación al estudiante..." defaultValue={e.retroalimentacion || ""}
                    onBlur={(ev) => { if (ev.target.value !== (e.retroalimentacion || "")) setEstado(e.id, e.estado, ev.target.value); }} />
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setEstado(e.id, "en_revision")}>En revisión</Button>
                    <Button size="sm" variant="default" onClick={() => setEstado(e.id, "calificada")}>Marcar calificada</Button>
                    <Button size="sm" variant="destructive" onClick={() => setEstado(e.id, "rechazada")}>Rechazar</Button>
                  </div>
                </CardContent></Card>
              );
            })
          }
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={load}>Recargar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ════════════ FOROS (staff) ════════════
function StaffForosTab({ ofertaId }: { ofertaId: string }) {
  const { user } = useAuth();
  const { data: foros, isLoading } = useForos(ofertaId);
  const crear = useCrearForo();
  const [foroId, setForoId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [desc, setDesc] = useState("");

  if (foroId) {
    const foro = (foros || []).find((f: any) => f.id === foroId);
    return <StaffForoDetalle foro={foro} onBack={() => setForoId(null)} userId={user?.id} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Nuevo tema</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo tema de foro</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              <Textarea rows={4} placeholder="Descripción o pregunta" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <Button onClick={async () => {
                try { await crear.mutateAsync({ oferta_id: ofertaId, titulo, descripcion: desc, autor_nombre: "Docente" }); toast.success("Foro creado"); setOpen(false); setTitulo(""); setDesc(""); }
                catch (e: any) { toast.error(e.message); }
              }} disabled={!titulo || crear.isPending} className="w-full">Publicar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p> :
        !foros?.length ? <p className="text-sm text-muted-foreground py-4 text-center">Sin temas todavía</p> :
        foros.map((f: any) => (
          <button key={f.id} onClick={() => setForoId(f.id)} className="w-full text-left p-3 border rounded bg-card hover:bg-accent/50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {f.cerrado && <Badge variant="secondary" className="text-[10px] gap-1"><Lock className="h-3 w-3" />Cerrado</Badge>}
                  <p className="font-medium text-sm">{f.titulo}</p>
                </div>
                {f.descripcion && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{f.descripcion}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{f.autor_nombre || "—"} · {fmtDateTime(f.created_at)}</p>
              </div>
              <Badge variant="outline" className="shrink-0"><MessageSquare className="h-3 w-3 mr-1" />{f.mensajes_count}</Badge>
            </div>
          </button>
        ))
      }
    </div>
  );
}

function StaffForoDetalle({ foro, onBack, userId }: any) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const pageSize = 10;
  const { data: msgs, isLoading } = useForoMensajes(foro?.id, { page, pageSize, search });
  const items = msgs?.items || [];
  const total = msgs?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const enviar = useEnviarMensajeForo();
  const borrar = useEliminarMensajeForo();
  const toggle = useToggleForoCerrado();
  const [texto, setTexto] = useState("");

  if (!foro) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" />Volver</Button>
        <Button size="sm" variant="outline" onClick={async () => {
          try { await toggle.mutateAsync({ id: foro.id, cerrado: !foro.cerrado }); toast.success(foro.cerrado ? "Foro abierto" : "Foro cerrado"); }
          catch (e: any) { toast.error(e.message); }
        }}>
          {foro.cerrado ? <><Unlock className="h-3 w-3 mr-1" />Reabrir</> : <><Lock className="h-3 w-3 mr-1" />Cerrar foro</>}
        </Button>
      </div>
      <Card><CardContent className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold">{foro.titulo}</p>
          {foro.cerrado && <Badge variant="secondary" className="text-[10px] gap-1"><Lock className="h-3 w-3" />Cerrado</Badge>}
        </div>
        {foro.descripcion && <p className="text-sm text-muted-foreground mt-1">{foro.descripcion}</p>}
      </CardContent></Card>

      <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(0); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-7 h-9" placeholder="Buscar..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Button type="submit" size="sm" variant="outline">Buscar</Button>
      </form>

      <div className="space-y-2">
        {isLoading ? <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p> :
          !items.length ? <p className="text-sm text-muted-foreground py-4 text-center">{search ? "Sin coincidencias" : "Sin respuestas"}</p> :
          items.map((m: any) => (
            <div key={m.id} className="flex gap-2 p-2 border rounded bg-card">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs">{m.autor_nombre?.[0] || "?"}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">{m.autor_nombre || "Anónimo"}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDateTime(m.created_at)}</p>
                  <Button size="icon" variant="ghost" className="h-5 w-5 ml-auto text-destructive"
                    onClick={async () => { try { await borrar.mutateAsync(m.id); } catch (e: any) { toast.error(e.message); } }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap mt-0.5">{m.mensaje}</p>
              </div>
            </div>
          ))
        }
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{total} mensajes · página {page + 1} de {totalPages}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}><ChevronLeft className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3 w-3" /></Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t">
        <Textarea rows={2} placeholder="Responder como docente..." value={texto} onChange={(e) => setTexto(e.target.value)} />
        <Button onClick={async () => {
          if (!texto.trim()) return;
          try { await enviar.mutateAsync({ foro_id: foro.id, mensaje: texto, autor_nombre: "Docente" }); setTexto(""); }
          catch (e: any) { toast.error(e.message); }
        }} disabled={!texto.trim() || enviar.isPending}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
