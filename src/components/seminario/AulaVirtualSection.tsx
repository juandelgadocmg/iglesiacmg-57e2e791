import { useState } from "react";
import { useProgramas, usePeriodos, useOfertas, useCalificacionesMatriz, useEvaluaciones, useRecursos, useAnuncios, useUpsertAnuncio, useDeleteAnuncio } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Video, Megaphone, Plus, Trash2, FileText, Calendar, User, Clock, MapPin, Eye, Settings } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import { useCan } from "@/hooks/useCan";
import { useUserRoles } from "@/hooks/useUserRoles";
import MiAulaSection from "./MiAulaSection";

export default function AulaVirtualSection() {
  const { roles } = useUserRoles();
  const isStaff = (roles || []).some((r: string) => ["admin", "super_admin", "pastor", "seminario_admin", "maestro"].includes(r));
  const [previewStudent, setPreviewStudent] = useState(false);
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
          <h2 className="text-lg font-semibold">Aula Virtual</h2>
          <p className="text-xs text-muted-foreground">Vista de la materia con estudiantes, recursos y anuncios</p>
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
            <CardContent className="p-4 space-y-2" style={{ borderLeft: `4px solid ${ofertaSel.sem_materias?.color || "#3b82f6"}` }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-semibold">{ofertaSel.sem_materias?.nombre}</h3>
                  <p className="text-xs text-muted-foreground">{ofertaSel.sem_materias?.codigo} · {ofertaSel.sem_materias?.creditos} créditos</p>
                </div>
                <div className="flex gap-2">
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
            </CardContent>
          </Card>

          <Tabs defaultValue="estudiantes">
            <TabsList>
              <TabsTrigger value="estudiantes">Estudiantes ({matriz?.estudiantes?.length || 0})</TabsTrigger>
              <TabsTrigger value="anuncios">Anuncios ({anuncios?.length || 0})</TabsTrigger>
              <TabsTrigger value="recursos">Recursos ({recursos?.length || 0})</TabsTrigger>
              <TabsTrigger value="evaluaciones">Próximas evaluaciones</TabsTrigger>
            </TabsList>

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
                    <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="recursos" className="space-y-2">
              {!recursos?.length ? (
                <p className="text-sm text-muted-foreground p-4 text-center">Sin recursos para esta materia</p>
              ) : recursos.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 p-2 border rounded">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.titulo}</p>
                    <p className="text-[10px] text-muted-foreground">{r.tipo}</p>
                  </div>
                  {r.url && <Button size="sm" variant="outline" asChild><a href={r.url} target="_blank" rel="noopener noreferrer">Abrir</a></Button>}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="evaluaciones" className="space-y-2">
              {!evals?.length ? (
                <p className="text-sm text-muted-foreground p-4 text-center">Sin evaluaciones programadas</p>
              ) : evals.map((e: any) => (
                <div key={e.id} className="flex items-center gap-2 p-2 border rounded">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{e.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">{e.tipo} · {e.peso}%</p>
                  </div>
                  <Badge variant="outline">{e.fecha || "sin fecha"}</Badge>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
