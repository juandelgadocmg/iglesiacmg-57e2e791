import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, Send, Save, X, Users, BookOpen, GraduationCap, FileText, Clock } from "lucide-react";
import {
  useProfilesDirectory, useSendMessage, useSaveDraft,
  useOfertasForMessaging, useProgramasForMessaging,
  fetchRecipientsByOferta, fetchRecipientsByPrograma, fetchRecipientsByRole,
  validateAttachment, ATTACHMENT_MAX_BYTES,
  useMsgTemplates, useCreateScheduled, applyVariables, extractVariables,
  logBulkSend,
} from "@/hooks/useMensajes";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: { subject?: string; body?: string; recipients?: string[]; replyThreadId?: string | null; draftId?: string };
}

const ROLE_GROUPS = [
  { id: "admin", label: "Todos los administradores", role: "admin" },
  { id: "maestro", label: "Todos los docentes", role: "maestro" },
  { id: "seminario_estudiante", label: "Todos los estudiantes", role: "seminario_estudiante" },
  { id: "pastor", label: "Todos los pastores", role: "pastor" },
];

const LOCAL_KEY = (id: string) => `msg_composer_draft_${id}`;

export default function MensajeComposer({ open, onOpenChange, initial }: Props) {
  const { data: directory = [] } = useProfilesDirectory();
  const { data: ofertas = [] } = useOfertasForMessaging();
  const { data: programas = [] } = useProgramasForMessaging();
  const { data: templates = [] } = useMsgTemplates();
  const send = useSendMessage();
  const saveDraft = useSaveDraft();
  const createScheduled = useCreateScheduled();

  const localKey = useMemo(
    () => LOCAL_KEY(initial?.draftId || initial?.replyThreadId || "new"),
    [initial?.draftId, initial?.replyThreadId]
  );

  const [subject, setSubject] = useState(initial?.subject || "");
  const [body, setBody] = useState(initial?.body || "");
  const [recipients, setRecipients] = useState<string[]>(initial?.recipients || []);
  const [files, setFiles] = useState<File[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [programaSel, setProgramaSel] = useState<string>("");
  const [semestreSel, setSemestreSel] = useState<string>("");
  const [ofertaSel, setOfertaSel] = useState<string>("");

  // Variable values for templates
  const [varValues, setVarValues] = useState<Record<string, string>>({});

  // Scheduling
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>("");
  const [scheduleScope, setScheduleScope] = useState<"oferta" | "programa" | "role">("oferta");
  const [scheduleRole, setScheduleRole] = useState("seminario_estudiante");

  // Restore from localStorage on open
  useEffect(() => {
    if (!open) return;
    const cached = localStorage.getItem(localKey);
    if (cached && !initial?.subject && !initial?.body) {
      try {
        const c = JSON.parse(cached);
        setSubject(c.subject || "");
        setBody(c.body || "");
        setRecipients(c.recipients || []);
        setVarValues(c.varValues || {});
        if (c.subject || c.body) toast.info("Borrador recuperado automáticamente");
      } catch {}
    } else {
      setSubject(initial?.subject || "");
      setBody(initial?.body || "");
      setRecipients(initial?.recipients || []);
      setVarValues({});
    }
    setFiles([]);
    setProgramaSel(""); setSemestreSel(""); setOfertaSel("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, localKey]);

  // Autosave to localStorage
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      localStorage.setItem(localKey, JSON.stringify({ subject, body, recipients, varValues }));
    }, 600);
    return () => clearTimeout(t);
  }, [subject, body, recipients, varValues, open, localKey]);

  const clearLocalDraft = () => localStorage.removeItem(localKey);

  const addIds = (ids: string[]) => setRecipients((prev) => Array.from(new Set([...prev, ...ids.filter(Boolean)])));
  const addRecipient = (id: string) => addIds([id]);
  const removeRecipient = (id: string) => setRecipients((prev) => prev.filter((r) => r !== id));

  const addByRole = async (role: string) => {
    try {
      const ids = await fetchRecipientsByRole(role);
      if (!ids.length) return toast.info("No hay usuarios para ese rol");
      addIds(ids);
      toast.success(`Se agregaron ${ids.length} destinatarios`);
    } catch (e: any) { toast.error(e.message); }
  };

  const addByOferta = async () => {
    if (!ofertaSel) return;
    try {
      const ids = await fetchRecipientsByOferta(ofertaSel);
      if (!ids.length) return toast.info("La materia no tiene inscritos");
      addIds(ids); toast.success(`Se agregaron ${ids.length} estudiantes`);
    } catch (e: any) { toast.error(e.message); }
  };

  const addByPrograma = async () => {
    if (!programaSel) return;
    try {
      const sem = semestreSel && semestreSel !== "0" ? parseInt(semestreSel) : null;
      const ids = await fetchRecipientsByPrograma(programaSel, sem);
      if (!ids.length) return toast.info("No hay inscritos");
      addIds(ids); toast.success(`Se agregaron ${ids.length} estudiantes`);
    } catch (e: any) { toast.error(e.message); }
  };

  const applyTemplate = (tplId: string) => {
    const t = templates.find((x) => x.id === tplId);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
    const vars: Record<string, string> = {};
    t.variables.forEach((v) => { vars[v] = varValues[v] || ""; });
    setVarValues(vars);
    toast.success(`Plantilla "${t.name}" aplicada`);
  };

  const detectedVars = useMemo(() => extractVariables(`${subject} ${body}`), [subject, body]);
  const finalSubject = applyVariables(subject, varValues);
  const finalBody = applyVariables(body, varValues);

  const onPickFiles = (selected: File[]) => {
    const valid: File[] = [];
    for (const f of selected) {
      const err = validateAttachment(f);
      if (err) toast.error(err);
      else valid.push(f);
    }
    setFiles((prev) => [...prev, ...valid]);
  };

  const onSend = async () => {
    try {
      const isMass = recipients.length > 5;
      await send.mutateAsync({
        subject: finalSubject, body: finalBody, recipientUserIds: recipients, files,
        replyThreadId: initial?.replyThreadId || null,
      });
      if (isMass) {
        await logBulkSend({
          scope_type: "users",
          scope_detail: { user_ids_count: recipients.length },
          subject: finalSubject, body: finalBody,
          recipients_count: recipients.length, threads_created: 1, threads_failed: 0,
        });
      }
      toast.success("Mensaje enviado");
      clearLocalDraft();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Error al enviar");
      if (recipients.length > 5) {
        await logBulkSend({
          scope_type: "users", subject: finalSubject, body: finalBody,
          recipients_count: recipients.length, threads_created: 0, threads_failed: 1,
          errors: { message: e.message },
        });
      }
    }
  };

  const onSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync({
        id: initial?.draftId, subject, body, recipientUserIds: recipients,
        replyThreadId: initial?.replyThreadId || null,
      });
      toast.success("Borrador guardado");
      clearLocalDraft();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar borrador");
    }
  };

  const onSchedule = async () => {
    try {
      if (!scheduleAt) return toast.error("Selecciona fecha y hora");
      const scope_ref =
        scheduleScope === "oferta" ? ofertaSel :
        scheduleScope === "programa" ? programaSel :
        scheduleRole;
      if (!scope_ref) return toast.error("Selecciona destinatario del recordatorio");
      if (!subject) return toast.error("Asunto requerido");
      await createScheduled.mutateAsync({
        scheduled_for: new Date(scheduleAt).toISOString(),
        scope_type: scheduleScope,
        scope_ref,
        semestre: scheduleScope === "programa" && semestreSel && semestreSel !== "0" ? parseInt(semestreSel) : null,
        user_ids: null,
        subject, body,
        variables: varValues,
        system_sender_key: "notificaciones_cmg",
      } as any);
      toast.success("Recordatorio programado");
      clearLocalDraft();
      setScheduleOpen(false);
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message || "Error al programar"); }
  };

  const recipientLabel = (id: string) => directory.find((u: any) => u.user_id === id)?.display_name || id.slice(0, 8);
  const selectedPrograma = programas.find((p: any) => p.id === programaSel);
  const maxSemestres = (selectedPrograma as any)?.duracion_semestres || (selectedPrograma as any)?.semestres || 12;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.replyThreadId ? "Responder mensaje" : "Nuevo mensaje"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Template picker */}
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Select onValueChange={applyTemplate}>
                <SelectTrigger className="h-8 max-w-xs"><SelectValue placeholder="Aplicar plantilla…" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recipients chips */}
          <div className="flex items-center gap-2 flex-wrap min-h-9 border rounded-md px-2 py-1.5 bg-background">
            <Users className="h-4 w-4 text-muted-foreground" />
            {recipients.length === 0 && <span className="text-xs text-muted-foreground">Para…</span>}
            {recipients.slice(0, 20).map((r) => (
              <Badge key={r} variant="secondary" className="gap-1">
                {recipientLabel(r)}
                <button onClick={() => removeRecipient(r)} className="ml-1"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {recipients.length > 20 && <Badge variant="outline">+{recipients.length - 20} más</Badge>}
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 text-xs">+ Agregar persona</Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por nombre…" />
                  <CommandList>
                    <CommandEmpty>Sin resultados</CommandEmpty>
                    <CommandGroup heading="Personas">
                      {directory.slice(0, 200).map((u: any) => (
                        <CommandItem key={u.user_id} onSelect={() => addRecipient(u.user_id)}>
                          <span className="truncate">{u.display_name}</span>
                          {u.roles[0] && <Badge variant="outline" className="ml-auto text-[10px]">{u.roles[0]}</Badge>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {recipients.length > 0 && (
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setRecipients([])}>Limpiar</Button>
            )}
          </div>

          {/* Mass recipients */}
          <div className="rounded-md border p-3 space-y-2 bg-muted/30">
            <div className="text-xs font-medium text-muted-foreground">Agregar grupos masivos / Programar</div>
            <div className="flex flex-wrap gap-2">
              {ROLE_GROUPS.map((g) => (
                <Button key={g.id} size="sm" variant="outline" onClick={() => addByRole(g.role)}>
                  <Users className="h-3.5 w-3.5 mr-1" /> {g.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap items-center pt-1">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <Select value={ofertaSel} onValueChange={setOfertaSel}>
                <SelectTrigger className="w-[260px] h-8"><SelectValue placeholder="Materia (oferta)" /></SelectTrigger>
                <SelectContent>
                  {ofertas.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="secondary" onClick={addByOferta} disabled={!ofertaSel}>Agregar inscritos</Button>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <Select value={programaSel} onValueChange={(v) => { setProgramaSel(v); setSemestreSel(""); }}>
                <SelectTrigger className="w-[220px] h-8"><SelectValue placeholder="Programa" /></SelectTrigger>
                <SelectContent>
                  {programas.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={semestreSel} onValueChange={setSemestreSel} disabled={!programaSel}>
                <SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="Semestre (todos)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos los semestres</SelectItem>
                  {Array.from({ length: maxSemestres || 12 }).map((_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>Semestre {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="secondary" onClick={addByPrograma} disabled={!programaSel}>Agregar</Button>
            </div>
          </div>

          <Input placeholder="Asunto" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Escribe tu mensaje… puedes usar variables como {nombre}, {curso}, {semestre}" value={body} onChange={(e) => setBody(e.target.value)} rows={10} />

          {/* Variable inputs */}
          {detectedVars.length > 0 && (
            <div className="rounded-md border p-3 space-y-2 bg-amber-50/30 dark:bg-amber-950/10">
              <div className="text-xs font-medium">Valores de variables</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {detectedVars.map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">{`{${v}}`}</Badge>
                    <Input
                      className="h-7 text-xs"
                      placeholder="Valor"
                      value={varValues[v] || ""}
                      onChange={(e) => setVarValues({ ...varValues, [v]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          <div>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-primary hover:underline">
              <Paperclip className="h-4 w-4" />
              Adjuntar archivos
              <span className="text-xs text-muted-foreground">(máx. {Math.round(ATTACHMENT_MAX_BYTES / 1024 / 1024)} MB c/u)</span>
              <input type="file" multiple className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,image/*,video/mp4,video/webm,audio/*"
                onChange={(e) => { onPickFiles(Array.from(e.target.files || [])); e.currentTarget.value = ""; }}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1">
                    <span className="truncate">{f.name} <span className="text-muted-foreground">({(f.size / 1024).toFixed(0)} KB)</span></span>
                    <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={onSaveDraft} disabled={saveDraft.isPending}>
            <Save className="h-4 w-4 mr-1" /> Guardar borrador
          </Button>
          <Button variant="outline" onClick={() => setScheduleOpen(true)}>
            <Clock className="h-4 w-4 mr-1" /> Programar
          </Button>
          <Button onClick={onSend} disabled={send.isPending}>
            <Send className="h-4 w-4 mr-1" /> Enviar {recipients.length > 0 && `(${recipients.length})`}
          </Button>
        </DialogFooter>

        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Programar recordatorio</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                El mensaje se enviará automáticamente desde "Notificaciones CMG" en la fecha indicada.
              </div>
              <div>
                <label className="text-xs font-medium">Fecha y hora</label>
                <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium">Destinatarios</label>
                <Select value={scheduleScope} onValueChange={(v: any) => setScheduleScope(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oferta">Materia (oferta) seleccionada arriba</SelectItem>
                    <SelectItem value="programa">Programa / semestre seleccionado arriba</SelectItem>
                    <SelectItem value="role">Por rol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scheduleScope === "role" && (
                <Select value={scheduleRole} onValueChange={setScheduleRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_GROUPS.map((g) => <SelectItem key={g.role} value={g.role}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
              <Button onClick={onSchedule} disabled={createScheduled.isPending}>Programar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
