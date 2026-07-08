import { useMemo, useState } from "react";
import {
  useMiPersona, useMisOfertas, useMiCurso, useSubirEntrega, useForos, useCrearForo,
  useForoMensajes, useEnviarMensajeForo, useEliminarMensajeForo, useMarcarAnuncioLeido,
  useIsSeminarioStaff, useToggleForoCerrado, useSignedUrl,
} from "@/hooks/useSeminarioStudent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft, BookOpen, Video, FileText, Megaphone, MessageSquare, Upload, Calendar, User, Clock,
  MapPin, CheckCircle2, AlertCircle, Download, Send, Trash2, Plus, GraduationCap, Bell, Eye,
  Lock, Unlock, Search, ChevronLeft, ChevronRight, History,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import AssetPreview from "@/components/shared/AssetPreview";
import { openAsset } from "@/lib/openAsset";

function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
function fmtDateTime(d?: string) { return d ? new Date(d).toLocaleString("es-CO") : "—"; }

function previewableUrl(url?: string, tipo?: string) {
  if (!url) return null;
  const t = (tipo || "").toLowerCase();
  const u = url.toLowerCase();
  if (t.includes("image") || /\.(png|jpe?g|gif|webp|svg)$/.test(u)) return { kind: "image", url };
  if (t.includes("pdf") || u.includes(".pdf")) return { kind: "pdf", url };
  if (t.includes("video") || /\.(mp4|webm|ogg)$/.test(u)) return { kind: "video", url };
  return { kind: "other", url };
}

export default function MiAulaSection() {
  const { user } = useAuth();
  const { data: persona, isLoading: loadingPersona } = useMiPersona();
  const { data: ofertas, isLoading } = useMisOfertas(persona?.id);
  const [selId, setSelId] = useState<string | null>(null);
  const selected = (ofertas as any[] || []).find((o: any) => o.id === selId);

  // ⚠ Hooks deben ir antes de cualquier return condicional
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    (ofertas as any[] || []).forEach((im: any) => {
      const per = im.sem_ofertas?.sem_periodos;
      const key = per?.nombre || "Sin periodo";
      (map[key] ||= []).push(im);
    });
    return map;
  }, [ofertas]);

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
  const periodoId = of?.periodo_id;
  const { data, isLoading } = useMiCurso(im.id, im.oferta_id, im.materia_id, persona.id, periodoId);

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

  // Notificaciones: anuncios sin leer, entregas recientes calificadas con retro
  const notifs = useMemo(() => {
    if (!data) return { anunNoLeidos: 0, calificadasRecientes: 0, retroNuevas: 0 };
    const anunNoLeidos = (data.anuncios || []).filter((a: any) => !data.lecturas[a.id]).length;
    let calificadasRecientes = 0, retroNuevas = 0;
    Object.values(data.entregasPorEval || {}).forEach((arr: any[]) => {
      const ultima = arr[0]; // ordenado desc
      if (!ultima) return;
      if (ultima.estado === "calificada") calificadasRecientes++;
      if (ultima.retroalimentacion) retroNuevas++;
    });
    return { anunNoLeidos, calificadasRecientes, retroNuevas };
  }, [data]);
  const totalNotifs = notifs.anunNoLeidos + notifs.calificadasRecientes + notifs.retroNuevas;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Mis materias</Button>
        {totalNotifs > 0 && (
          <Badge variant="default" className="gap-1"><Bell className="h-3 w-3" />{totalNotifs} novedad{totalNotifs > 1 ? "es" : ""}</Badge>
        )}
      </div>

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
              {(mat?.zoom_link || of?.zoom_link) && (
                <Button size="sm" asChild>
                  <a href={mat?.zoom_link || of?.zoom_link} target="_blank" rel="noopener noreferrer">
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

          {/* Notificaciones */}
          {totalNotifs > 0 && (
            <div className="border rounded-md p-2 bg-primary/5 space-y-1">
              {notifs.anunNoLeidos > 0 && <p className="text-xs flex items-center gap-2"><Megaphone className="h-3.5 w-3.5 text-primary" />Tienes {notifs.anunNoLeidos} anuncio(s) sin leer</p>}
              {notifs.calificadasRecientes > 0 && <p className="text-xs flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />{notifs.calificadasRecientes} entrega(s) calificada(s)</p>}
              {notifs.retroNuevas > 0 && <p className="text-xs flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5 text-primary" />{notifs.retroNuevas} retroalimentación(es) del docente</p>}
            </div>
          )}

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

      <Tabs defaultValue="evaluaciones">
        <TabsList className="w-full flex-wrap h-auto justify-start">
          <TabsTrigger value="anuncios" className="relative">
            <Megaphone className="h-3.5 w-3.5 mr-1" />Anuncios ({data?.anuncios?.length || 0})
            {notifs.anunNoLeidos > 0 && <span className="ml-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] inline-flex items-center justify-center">{notifs.anunNoLeidos}</span>}
          </TabsTrigger>
          <TabsTrigger value="evaluaciones" className="relative">
            <Upload className="h-3.5 w-3.5 mr-1" />Mis trabajos / Evaluaciones ({data?.evaluaciones?.length || 0})
            {(() => {
              const pendientes = (data?.evaluaciones || []).filter((e: any) => !(data?.entregasPorEval?.[e.id]?.length)).length;
              return pendientes > 0 ? <span className="ml-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] inline-flex items-center justify-center">{pendientes}</span> : null;
            })()}
          </TabsTrigger>
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
              <AnuncioCard key={a.id} a={a} lectura={data.lecturas[a.id]} personaId={persona.id} />
            ))
          }
        </TabsContent>

        {/* EVALUACIONES + ENTREGAS */}
        <TabsContent value="evaluaciones" className="space-y-2">
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-3 flex items-start gap-2">
              <Upload className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold">Espacio para subir tus trabajos</p>
                <p className="text-muted-foreground">Cada evaluación tiene un botón <strong>"Subir trabajo"</strong> donde puedes cargar tu documento (PDF, Word, etc., máx 50MB). Puedes enviar nuevas versiones y revisar la retroalimentación del docente.</p>
              </div>
            </CardContent>
          </Card>
          {isLoading ? <Skeleton n={4} /> :
            !data?.evaluaciones?.length ? <Empty icon={GraduationCap} text="Aún no hay evaluaciones publicadas. Cuando el docente las cree, aquí podrás subir tus trabajos." /> :
            data.evaluaciones.map((e: any) => (
              <EvaluacionRow key={e.id} ev={e} entregas={data.entregasPorEval[e.id] || []} calificacion={data.calificaciones[e.id]}
                inscripcionMateriaId={im.id} personaId={persona.id} />
            ))
          }
        </TabsContent>

        {/* NOTAS */}
        <TabsContent value="notas" className="space-y-2">
          {isLoading ? <Skeleton n={3} /> : (
            <Card><CardContent className="p-0 overflow-x-auto">
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
            !data?.recursos?.length ? <Empty icon={FileText} text="Sin recursos disponibles para tu curso y periodo" /> :
            data.recursos.map((r: any) => <RecursoRow key={r.id} r={r} />)
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

// ────────── Anuncio ──────────
function AnuncioCard({ a, lectura, personaId }: { a: any; lectura?: any; personaId: string }) {
  const marcar = useMarcarAnuncioLeido();
  const leido = !!lectura;
  return (
    <Card className={leido ? "" : "border-primary/40"}>
      <CardContent className="p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm flex-1">{a.titulo}</p>
          {leido
            ? <Badge variant="outline" className="text-[10px] gap-1"><Eye className="h-3 w-3" />Leído</Badge>
            : <Badge variant="default" className="text-[10px]">Nuevo</Badge>}
        </div>
        <p className="text-sm whitespace-pre-wrap">{a.mensaje}</p>
        <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
          <p className="text-[10px] text-muted-foreground">{fmtDateTime(a.created_at)}{leido && ` · Leído ${fmtDateTime(lectura.leido_at)}`}</p>
          {!leido && (
            <Button size="sm" variant="outline" onClick={async () => {
              try { await marcar.mutateAsync({ anuncio_id: a.id, persona_id: personaId }); }
              catch (e: any) { toast.error(e.message); }
            }} disabled={marcar.isPending}>
              <CheckCircle2 className="h-3 w-3 mr-1" />Marcar leído
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ────────── Recursos ──────────
function RecursoRow({ r }: { r: any }) {
  const [open, setOpen] = useState(false);
  const sign = useSignedUrl();
  const [signed, setSigned] = useState<string | null>(null);
  const url = signed || r.url;
  const prev = previewableUrl(url, r.tipo);

  const handleOpen = async () => {
    setOpen(true);
    if (!r.url && r.storage_path && !signed) {
      try {
        const s = await sign.mutateAsync({ bucket: "recursos-academicos", path: r.storage_path });
        if (s) setSigned(s);
      } catch (e: any) { toast.error("No se pudo cargar la vista previa"); }
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border rounded bg-card">
      <FileText className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{r.titulo}</p>
        <p className="text-[10px] text-muted-foreground">{r.tipo}{r.descripcion ? ` · ${r.descripcion}` : ""}</p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" onClick={handleOpen}><Eye className="h-3 w-3 mr-1" />Ver</Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{r.titulo}</DialogTitle></DialogHeader>
          {!url ? <p className="text-sm text-muted-foreground p-4">Recurso sin archivo asociado.</p> :
            <AssetPreview url={url} bucket="recursos-academicos" kind={(prev?.kind as any) || "other"} filename={r.titulo} />
          }
          {url && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => openAsset({ url, bucket: "recursos-academicos", filename: r.titulo, download: true })}><Download className="h-3 w-3 mr-1" />Descargar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ────────── Evaluacion + historial entregas ──────────
function EvaluacionRow({ ev, entregas, calificacion, inscripcionMateriaId, personaId }: any) {
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [comentario, setComentario] = useState("");
  const subir = useSubirEntrega();

  const ultima = entregas[0]; // ordenada desc
  const handleSubir = async () => {
    if (!files.length) { toast.error("Selecciona al menos un archivo"); return; }
    const oversize = files.find(f => f.size > 50 * 1024 * 1024);
    if (oversize) { toast.error(`"${oversize.name}" supera 50MB`); return; }
    try {
      for (const f of files) {
        await subir.mutateAsync({ file: f, evaluacion_id: ev.id, inscripcion_materia_id: inscripcionMateriaId, persona_id: personaId, comentario });
      }
      toast.success(files.length > 1 ? `${files.length} entregas enviadas` : "Entrega enviada");
      setOpen(false); setFiles([]); setComentario("");
    } catch (e: any) { toast.error(e.message); }
  };


  const vencida = ev.fecha && new Date(ev.fecha) < new Date() && !ultima;
  const estadoBadge = (estado: string) => {
    const map: any = { enviada: "secondary", en_revision: "default", calificada: "default", rechazada: "destructive" };
    return <Badge variant={map[estado] || "outline"} className="text-[10px]">{estado.replace("_", " ")}</Badge>;
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">{ev.nombre}</p>
              <Badge variant="outline" className="text-[10px]">{ev.tipo}</Badge>
              <Badge variant="secondary" className="text-[10px]">{ev.peso}%</Badge>
              {entregas.length > 0 && <Badge variant="outline" className="text-[10px]">v{ultima.version} · {entregas.length} intento(s)</Badge>}
            </div>
            {ev.descripcion && <p className="text-xs text-muted-foreground mt-1">{ev.descripcion}</p>}
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />{ev.fecha ? fmtDate(ev.fecha) : "Sin fecha"}
              {vencida && <span className="text-destructive ml-2">· Vencida</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {calificacion?.nota != null && (
              <Badge variant={Number(calificacion.nota) >= 3 ? "default" : "destructive"}>Nota: {Number(calificacion.nota).toFixed(2)}</Badge>
            )}
            {entregas.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => setHist(true)}><History className="h-3 w-3 mr-1" />Historial</Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant={ultima ? "outline" : "default"}>
                  <Upload className="h-3 w-3 mr-1" />{ultima ? "Nueva versión" : "Subir trabajo"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{ev.nombre}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  {ultima && (
                    <div className="p-2 bg-muted rounded text-xs space-y-1">
                      <p className="font-medium flex items-center gap-2">Última entrega (v{ultima.version}) {estadoBadge(ultima.estado)}</p>
                      <button type="button" onClick={() => openAsset({ url: ultima.archivo_url, bucket: "sem-entregas", path: ultima.archivo_path, filename: ultima.archivo_nombre })} className="text-primary underline truncate block text-left">{ultima.archivo_nombre}</button>
                      <p className="text-muted-foreground">Enviada: {fmtDateTime(ultima.created_at)}</p>
                      {ultima.retroalimentacion && (
                        <p className="pt-1 border-t mt-1"><span className="font-medium">Retroalimentación: </span>{ultima.retroalimentacion}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium">Archivos (puedes seleccionar varios, máx 50MB c/u)</label>
                    <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                    {files.length > 0 && (
                      <ul className="mt-1 text-[11px] text-muted-foreground space-y-0.5">
                        {files.map((f, i) => <li key={i}>• {f.name} ({(f.size / 1024).toFixed(0)} KB)</li>)}
                      </ul>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium">Comentario al docente (opcional)</label>
                    <Textarea rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} />
                  </div>
                  <Button onClick={handleSubir} disabled={!files.length || subir.isPending} className="w-full">
                    {subir.isPending ? "Subiendo..." : files.length > 1 ? `Enviar ${files.length} entregas` : "Enviar entrega"}
                  </Button>

                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {ultima && (
          <div className="flex items-center gap-2 text-xs p-2 bg-primary/5 rounded flex-wrap">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span>v{ultima.version} · {fmtDateTime(ultima.created_at)}</span>
            {estadoBadge(ultima.estado)}
            <button type="button" onClick={() => openAsset({ url: ultima.archivo_url, bucket: "sem-entregas", path: ultima.archivo_path, filename: ultima.archivo_nombre })} className="text-primary underline ml-auto truncate text-left">{ultima.archivo_nombre}</button>
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => openAsset({ url: ultima.archivo_url, bucket: "sem-entregas", path: ultima.archivo_path, filename: ultima.archivo_nombre, download: true })}><Download className="h-3 w-3" /></Button>

          </div>
        )}

        {/* Historial */}
        <Dialog open={hist} onOpenChange={setHist}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Historial de entregas · {ev.nombre}</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {entregas.map((e: any) => (
                <div key={e.id} className="border rounded p-2 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">v{e.version}</Badge>
                    {estadoBadge(e.estado)}
                    <span className="text-muted-foreground">{fmtDateTime(e.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => openAsset({ url: e.archivo_url, bucket: "sem-entregas", path: e.archivo_path, filename: e.archivo_nombre })} className="text-primary underline truncate flex-1 text-left">{e.archivo_nombre}</button>
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => openAsset({ url: e.archivo_url, bucket: "sem-entregas", path: e.archivo_path, filename: e.archivo_nombre, download: true })}><Download className="h-3 w-3" /></Button>
                  </div>

                  {e.comentario && <p><span className="font-medium">Comentario: </span>{e.comentario}</p>}
                  {e.retroalimentacion && <p className="border-t pt-1"><span className="font-medium">Retroalimentación: </span>{e.retroalimentacion}</p>}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
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
                <div className="flex items-center gap-2 flex-wrap">
                  {f.fijado && <Badge variant="default" className="text-[10px]">Fijado</Badge>}
                  {f.cerrado && <Badge variant="secondary" className="text-[10px] gap-1"><Lock className="h-3 w-3" />Cerrado</Badge>}
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
  const { data: staff } = useIsSeminarioStaff();
  const isStaff = !!staff;
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
  const toggleCerrado = useToggleForoCerrado();
  const [texto, setTexto] = useState("");

  const handleEnviar = async () => {
    if (!texto.trim()) return;
    if (foro.cerrado && !isStaff) { toast.error("Este foro está cerrado"); return; }
    try {
      await enviar.mutateAsync({ foro_id: foro.id, mensaje: texto, autor_nombre: personaNombre, autor_avatar: personaAvatar });
      setTexto("");
    } catch (e: any) { toast.error(e.message); }
  };

  if (!foro) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Volver a foros</Button>
        {isStaff && (
          <Button size="sm" variant="outline" onClick={async () => {
            try { await toggleCerrado.mutateAsync({ id: foro.id, cerrado: !foro.cerrado }); toast.success(foro.cerrado ? "Foro abierto" : "Foro cerrado"); }
            catch (e: any) { toast.error(e.message); }
          }}>
            {foro.cerrado ? <><Unlock className="h-3 w-3 mr-1" />Reabrir</> : <><Lock className="h-3 w-3 mr-1" />Cerrar foro</>}
          </Button>
        )}
      </div>
      <Card><CardContent className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold">{foro.titulo}</p>
          {foro.cerrado && <Badge variant="secondary" className="text-[10px] gap-1"><Lock className="h-3 w-3" />Cerrado</Badge>}
        </div>
        {foro.descripcion && <p className="text-sm text-muted-foreground mt-1">{foro.descripcion}</p>}
        <p className="text-[10px] text-muted-foreground mt-1">{foro.autor_nombre} · {fmtDateTime(foro.created_at)}</p>
      </CardContent></Card>

      {/* Búsqueda */}
      <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(0); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-7 h-9" placeholder="Buscar en el tema..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Button type="submit" size="sm" variant="outline">Buscar</Button>
        {search && <Button type="button" size="sm" variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); setPage(0); }}>Limpiar</Button>}
      </form>

      <div className="space-y-2">
        {isLoading ? <Skeleton n={3} /> :
          !items.length ? <p className="text-sm text-center text-muted-foreground py-4">{search ? "Sin coincidencias" : "Sé el primero en responder"}</p> :
          items.map((m: any) => (
            <div key={m.id} className="flex gap-2 p-2 border rounded bg-card">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-medium">
                {m.autor_avatar ? <img src={m.autor_avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : (m.autor_nombre?.[0] || "?")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">{m.autor_nombre || "Anónimo"}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDateTime(m.created_at)}</p>
                  {(m.autor_user_id === user?.id || isStaff) && (
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

      {/* Paginación */}
      {total > pageSize && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{total} mensajes · página {page + 1} de {totalPages}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}><ChevronLeft className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3 w-3" /></Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 sticky bottom-0 bg-background pt-2 border-t">
        <Textarea rows={2} placeholder={foro.cerrado && !isStaff ? "Foro cerrado por el staff" : "Escribe tu respuesta..."}
          value={texto} onChange={(e) => setTexto(e.target.value)} disabled={foro.cerrado && !isStaff} />
        <Button onClick={handleEnviar} disabled={!texto.trim() || enviar.isPending || (foro.cerrado && !isStaff)}><Send className="h-4 w-4" /></Button>
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
