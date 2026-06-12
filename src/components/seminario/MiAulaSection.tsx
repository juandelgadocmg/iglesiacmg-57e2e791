import { useMemo, useState } from "react";
import { useMiPersona, useMisOfertas, useMiCurso, useSubirEntrega, useForos, useCrearForo, useForoMensajes, useEnviarMensajeForo, useEliminarMensajeForo } from "@/hooks/useSeminarioStudent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, BookOpen, Video, FileText, Megaphone, MessageSquare, Upload, Calendar, User, Clock, MapPin, CheckCircle2, AlertCircle, Download, Send, Trash2, Plus, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
function fmtDateTime(d?: string) { return d ? new Date(d).toLocaleString("es-CO") : "—"; }

export default function MiAulaSection() {
  const { user } = useAuth();
  const { data: persona, isLoading: loadingPersona } = useMiPersona();
  const { data: ofertas, isLoading } = useMisOfertas(persona?.id);
  const [selId, setSelId] = useState<string | null>(null);
  const selected = (ofertas as any[] || []).find((o: any) => o.id === selId);

  if (loadingPersona || isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded" />)}
        </div>
      </div>
    );
  }

  if (!persona) {
    return (
      <Card><CardContent className="p-6 text-center space-y-2">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="font-medium">No encontramos tu ficha de estudiante</p>
        <p className="text-sm text-muted-foreground">Tu correo {user?.email} no está vinculado a una persona. Solicita a tu administrador que lo registre.</p>
      </CardContent></Card>
    );
  }

  if (selected) return <CursoDetalle persona={persona} im={selected} onBack={() => setSelId(null)} />;

  // Agrupado por periodo
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    (ofertas as any[] || []).forEach((im: any) => {
      const per = im.sem_ofertas?.sem_periodos;
      const key = per?.nombre || "Sin periodo";
      (map[key] ||= []).push(im);
    });
    return map;
  }, [ofertas]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold">
          {persona.nombres?.[0]}{persona.apellidos?.[0]}
        </div>
        <div>
          <h2 className="text-xl font-bold">Hola, {persona.nombres}</h2>
          <p className="text-xs text-muted-foreground">{persona.documento || persona.email}</p>
        </div>
      </div>

      {!ofertas?.length ? (
        <Card><CardContent className="p-8 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium">Aún no tienes materias matriculadas</p>
          <p className="text-sm text-muted-foreground">Habla con la coordinación del seminario para tu matrícula.</p>
        </CardContent></Card>
      ) : (
        Object.entries(grouped).map(([periodo, items]) => (
          <div key={periodo} className="space-y-2">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{periodo}</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((im: any) => {
                const mat = im.sem_materias;
                const of = im.sem_ofertas;
                const color = mat?.color || "#3b82f6";
                return (
                  <button
                    key={im.id}
                    onClick={() => setSelId(im.id)}
                    className="text-left rounded-lg border bg-card hover:shadow-md transition overflow-hidden"
                  >
                    <div className="h-20 p-3 flex flex-col justify-end text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                      <p className="text-xs opacity-90">{mat?.codigo}</p>
                      <p className="font-semibold text-sm line-clamp-2">{mat?.nombre}</p>
                    </div>
                    <div className="p-3 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3 w-3" />{of?.docente_nombre || "Sin docente"}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3 w-3" />{of?.horario || "Sin horario"}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <Badge variant="outline" className="text-[10px]">{im.estado}</Badge>
                        {im.nota_final !== null && (
                          <Badge variant={im.nota_final >= 3 ? "default" : "destructive"}>
                            {Number(im.nota_final).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
function CursoDetalle({ persona, im, onBack }: { persona: any; im: any; onBack: () => void }) {
  const mat = im.sem_materias;
  const of = im.sem_ofertas;
  const { data, isLoading } = useMiCurso(im.id, im.oferta_id, im.materia_id);

  const totalPeso = (data?.evaluaciones || []).reduce((s: number, e: any) => s + Number(e.peso || 0), 0);
  const promedioParcial = useMemo(() => {
    if (!data) return null;
    let suma = 0, peso = 0;
    data.evaluaciones.forEach((e: any) => {
      const c = data.calificaciones[e.id];
      if (c?.nota != null) { suma += Number(c.nota) * Number(e.peso); peso += Number(e.peso); }
    });
    return peso > 0 ? suma / peso : null;
  }, [data]);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Mis materias</Button>

      <Card>
        <div className="h-2" style={{ background: mat?.color || "#3b82f6" }} />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">{mat?.codigo} · {mat?.creditos} créditos</p>
              <h2 className="text-xl font-bold">{mat?.nombre}</h2>
              <p className="text-xs text-muted-foreground">{of?.sem_periodos?.nombre}</p>
            </div>
            <div className="flex gap-2">
              {im.nota_final != null && (
                <Badge variant={im.nota_final >= 3 ? "default" : "destructive"} className="text-base">
                  Nota final: {Number(im.nota_final).toFixed(2)}
                </Badge>
              )}
              {of?.zoom_link && (
                <Button size="sm" asChild>
                  <a href={of.zoom_link} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4 mr-1" />Unirse Zoom
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{of?.docente_nombre || "Sin docente"}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{of?.horario || "Sin horario"}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{of?.aula || "Sin aula"} · {of?.modalidad}</span>
          </div>
          {promedioParcial != null && (
            <div className="pt-2 border-t">
              <div className="flex justify-between text-xs mb-1">
                <span>Avance de calificaciones ({totalPeso}% evaluado)</span>
                <span className="font-semibold">{promedioParcial.toFixed(2)} / 5.00</span>
              </div>
              <Progress value={(promedioParcial / 5) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="anuncios">
        <TabsList className="w-full flex-wrap h-auto justify-start">
          <TabsTrigger value="anuncios"><Megaphone className="h-3.5 w-3.5 mr-1" />Anuncios ({data?.anuncios?.length || 0})</TabsTrigger>
          <TabsTrigger value="evaluaciones"><GraduationCap className="h-3.5 w-3.5 mr-1" />Evaluaciones y entregas</TabsTrigger>
          <TabsTrigger value="notas"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Mis notas</TabsTrigger>
          <TabsTrigger value="recursos"><FileText className="h-3.5 w-3.5 mr-1" />Recursos ({data?.recursos?.length || 0})</TabsTrigger>
          <TabsTrigger value="clases"><Video className="h-3.5 w-3.5 mr-1" />Clases grabadas</TabsTrigger>
          <TabsTrigger value="foros"><MessageSquare className="h-3.5 w-3.5 mr-1" />Foros</TabsTrigger>
        </TabsList>

        {/* ANUNCIOS */}
        <TabsContent value="anuncios" className="space-y-2">
          {isLoading ? <Skeleton n={3} /> :
            !data?.anuncios?.length ? <Empty icon={Megaphone} text="Sin anuncios del docente" /> :
            data.anuncios.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-primary" />
                    <p className="font-semibold text-sm">{a.titulo}</p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{a.mensaje}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDateTime(a.created_at)}</p>
                </CardContent>
              </Card>
            ))
          }
        </TabsContent>

        {/* EVALUACIONES + ENTREGAS */}
        <TabsContent value="evaluaciones" className="space-y-2">
          {isLoading ? <Skeleton n={4} /> :
            !data?.evaluaciones?.length ? <Empty icon={GraduationCap} text="Sin evaluaciones programadas" /> :
            data.evaluaciones.map((e: any) => (
              <EvaluacionRow key={e.id} ev={e} entrega={data.entregas[e.id]} calificacion={data.calificaciones[e.id]}
                inscripcionMateriaId={im.id} personaId={persona.id} />
            ))
          }
        </TabsContent>

        {/* NOTAS */}
        <TabsContent value="notas" className="space-y-2">
          {isLoading ? <Skeleton n={3} /> : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase">
                  <tr><th className="p-2 text-left">Evaluación</th><th className="p-2">Tipo</th><th className="p-2">Peso</th><th className="p-2">Nota</th><th className="p-2">Aporte</th></tr>
                </thead>
                <tbody>
                  {data?.evaluaciones?.map((e: any) => {
                    const c = data.calificaciones[e.id];
                    const aporte = c?.nota != null ? (Number(c.nota) * Number(e.peso) / 100) : null;
                    return (
                      <tr key={e.id} className="border-t">
                        <td className="p-2">{e.nombre}</td>
                        <td className="p-2 text-center"><Badge variant="outline" className="text-[10px]">{e.tipo}</Badge></td>
                        <td className="p-2 text-center text-xs">{e.peso}%</td>
                        <td className="p-2 text-center">
                          {c?.nota != null
                            ? <Badge variant={Number(c.nota) >= 3 ? "default" : "destructive"}>{Number(c.nota).toFixed(2)}</Badge>
                            : <span className="text-xs text-muted-foreground">Sin calificar</span>}
                        </td>
                        <td className="p-2 text-center text-xs">{aporte != null ? aporte.toFixed(2) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {im.nota_final != null && (
                  <tfoot className="bg-muted/50">
                    <tr><td colSpan={4} className="p-2 text-right font-semibold">Nota final</td>
                      <td className="p-2 text-center"><Badge variant={im.nota_final >= 3 ? "default" : "destructive"}>{Number(im.nota_final).toFixed(2)}</Badge></td></tr>
                  </tfoot>
                )}
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* RECURSOS */}
        <TabsContent value="recursos" className="space-y-2">
          {isLoading ? <Skeleton n={3} /> :
            !data?.recursos?.length ? <Empty icon={FileText} text="Sin recursos cargados" /> :
            data.recursos.map((r: any) => (
              <div key={r.id} className="flex items-center gap-2 p-2 border rounded bg-card">
                <FileText className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.titulo}</p>
                  <p className="text-[10px] text-muted-foreground">{r.tipo}</p>
                </div>
                {r.url && <Button size="sm" variant="outline" asChild><a href={r.url} target="_blank" rel="noopener noreferrer"><Download className="h-3 w-3 mr-1" />Abrir</a></Button>}
              </div>
            ))
          }
        </TabsContent>

        {/* CLASES GRABADAS */}
        <TabsContent value="clases" className="space-y-2">
          {isLoading ? <Skeleton n={3} /> :
            !data?.zoomSesiones?.length ? <Empty icon={Video} text="Aún no hay clases registradas" /> :
            data.zoomSesiones.map((z: any) => (
              <Card key={z.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center"><Video className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{z.topic || "Clase"}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDateTime(z.start_time)} · {z.duration_minutes} min</p>
                  </div>
                  <div className="flex gap-1">
                    {z.grabacion_url && <Button size="sm" variant="outline" asChild><a href={z.grabacion_url} target="_blank" rel="noopener noreferrer">Ver grabación</a></Button>}
                    {z.join_url && !z.realizada && <Button size="sm" asChild><a href={z.join_url} target="_blank" rel="noopener noreferrer">Unirse</a></Button>}
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </TabsContent>

        {/* FOROS */}
        <TabsContent value="foros">
          <ForosTab ofertaId={im.oferta_id} personaNombre={`${persona.nombres} ${persona.apellidos}`} personaAvatar={persona.foto_url} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ────────── Evaluacion + entrega ──────────
function EvaluacionRow({ ev, entrega, calificacion, inscripcionMateriaId, personaId }: any) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [comentario, setComentario] = useState("");
  const subir = useSubirEntrega();

  const handleSubir = async () => {
    if (!file) { toast.error("Selecciona un archivo"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Máximo 50MB"); return; }
    try {
      await subir.mutateAsync({ file, evaluacion_id: ev.id, inscripcion_materia_id: inscripcionMateriaId, persona_id: personaId, comentario });
      toast.success("Entrega enviada");
      setOpen(false); setFile(null); setComentario("");
    } catch (e: any) { toast.error(e.message); }
  };

  const vencida = ev.fecha && new Date(ev.fecha) < new Date() && !entrega;

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{ev.nombre}</p>
              <Badge variant="outline" className="text-[10px]">{ev.tipo}</Badge>
              <Badge variant="secondary" className="text-[10px]">{ev.peso}%</Badge>
            </div>
            {ev.descripcion && <p className="text-xs text-muted-foreground mt-1">{ev.descripcion}</p>}
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />{ev.fecha ? fmtDate(ev.fecha) : "Sin fecha"}
              {vencida && <span className="text-destructive ml-2">· Vencida</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {calificacion?.nota != null && (
              <Badge variant={Number(calificacion.nota) >= 3 ? "default" : "destructive"}>Nota: {Number(calificacion.nota).toFixed(2)}</Badge>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant={entrega ? "outline" : "default"}>
                  <Upload className="h-3 w-3 mr-1" />{entrega ? "Reemplazar" : "Subir trabajo"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{ev.nombre}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  {entrega && (
                    <div className="p-2 bg-muted rounded text-xs space-y-1">
                      <p className="font-medium">Entrega actual:</p>
                      <a href={entrega.archivo_url} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate block">{entrega.archivo_nombre}</a>
                      <p className="text-muted-foreground">Enviada: {fmtDateTime(entrega.created_at)}</p>
                      {entrega.retroalimentacion && (
                        <p className="pt-1 border-t mt-1"><span className="font-medium">Retroalimentación: </span>{entrega.retroalimentacion}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium">Archivo (máx 50MB)</label>
                    <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Comentario al docente (opcional)</label>
                    <Textarea rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} />
                  </div>
                  <Button onClick={handleSubir} disabled={!file || subir.isPending} className="w-full">
                    {subir.isPending ? "Subiendo..." : "Enviar entrega"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {entrega && (
          <div className="flex items-center gap-2 text-xs p-2 bg-primary/5 rounded">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span>Entregado {fmtDateTime(entrega.created_at)}</span>
            <a href={entrega.archivo_url} target="_blank" rel="noopener noreferrer" className="text-primary underline ml-auto truncate">{entrega.archivo_nombre}</a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────── Foros ──────────
function ForosTab({ ofertaId, personaNombre, personaAvatar }: { ofertaId: string; personaNombre: string; personaAvatar?: string }) {
  const { data: foros, isLoading } = useForos(ofertaId);
  const crear = useCrearForo();
  const [foroId, setForoId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [desc, setDesc] = useState("");

  const handleCrear = async () => {
    try {
      await crear.mutateAsync({ oferta_id: ofertaId, titulo, descripcion: desc, autor_nombre: personaNombre });
      toast.success("Foro creado"); setOpen(false); setTitulo(""); setDesc("");
    } catch (e: any) { toast.error(e.message); }
  };

  if (foroId) {
    const foro = (foros || []).find((f: any) => f.id === foroId);
    return <ForoDetalle foro={foro} onBack={() => setForoId(null)} personaNombre={personaNombre} personaAvatar={personaAvatar} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Nuevo tema</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo tema de foro</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título del tema" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              <Textarea rows={4} placeholder="Descripción o pregunta" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <Button onClick={handleCrear} disabled={!titulo || crear.isPending} className="w-full">Publicar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton n={3} /> :
        !foros?.length ? <Empty icon={MessageSquare} text="Sin temas. ¡Inicia uno!" /> :
        foros.map((f: any) => (
          <button key={f.id} onClick={() => setForoId(f.id)} className="w-full text-left p-3 border rounded bg-card hover:bg-accent/50 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {f.fijado && <Badge variant="default" className="text-[10px]">Fijado</Badge>}
                  <p className="font-medium text-sm">{f.titulo}</p>
                </div>
                {f.descripcion && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{f.descripcion}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{f.autor_nombre || "Anónimo"} · {fmtDateTime(f.created_at)}</p>
              </div>
              <Badge variant="outline" className="shrink-0"><MessageSquare className="h-3 w-3 mr-1" />{f.mensajes_count}</Badge>
            </div>
          </button>
        ))
      }
    </div>
  );
}

function ForoDetalle({ foro, onBack, personaNombre, personaAvatar }: any) {
  const { user } = useAuth();
  const { data: mensajes, isLoading } = useForoMensajes(foro?.id);
  const enviar = useEnviarMensajeForo();
  const borrar = useEliminarMensajeForo();
  const [texto, setTexto] = useState("");

  const handleEnviar = async () => {
    if (!texto.trim()) return;
    try {
      await enviar.mutateAsync({ foro_id: foro.id, mensaje: texto, autor_nombre: personaNombre, autor_avatar: personaAvatar });
      setTexto("");
    } catch (e: any) { toast.error(e.message); }
  };

  if (!foro) return null;
  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Volver a foros</Button>
      <Card><CardContent className="p-3">
        <p className="font-semibold">{foro.titulo}</p>
        {foro.descripcion && <p className="text-sm text-muted-foreground mt-1">{foro.descripcion}</p>}
        <p className="text-[10px] text-muted-foreground mt-1">{foro.autor_nombre} · {fmtDateTime(foro.created_at)}</p>
      </CardContent></Card>

      <div className="space-y-2">
        {isLoading ? <Skeleton n={3} /> :
          !mensajes?.length ? <p className="text-sm text-center text-muted-foreground py-4">Sé el primero en responder</p> :
          mensajes.map((m: any) => (
            <div key={m.id} className="flex gap-2 p-2 border rounded bg-card">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-medium">
                {m.autor_avatar ? <img src={m.autor_avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : (m.autor_nombre?.[0] || "?")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">{m.autor_nombre || "Anónimo"}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDateTime(m.created_at)}</p>
                  {m.autor_user_id === user?.id && (
                    <Button size="icon" variant="ghost" className="h-5 w-5 ml-auto text-destructive"
                      onClick={async () => { try { await borrar.mutateAsync(m.id); } catch (e: any) { toast.error(e.message); } }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap mt-0.5">{m.mensaje}</p>
              </div>
            </div>
          ))
        }
      </div>

      <div className="flex gap-2 sticky bottom-0 bg-background pt-2 border-t">
        <Textarea rows={2} placeholder="Escribe tu respuesta..." value={texto} onChange={(e) => setTexto(e.target.value)} />
        <Button onClick={handleEnviar} disabled={!texto.trim() || enviar.isPending}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function Skeleton({ n }: { n: number }) {
  return <div className="space-y-2">{Array.from({ length: n }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>;
}
function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return <div className="text-center py-8 text-muted-foreground"><Icon className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">{text}</p></div>;
}
