import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Paperclip, Send, Save, X, Users } from "lucide-react";
import { useProfilesDirectory, useSendMessage, useSaveDraft } from "@/hooks/useMensajes";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: { subject?: string; body?: string; recipients?: string[]; replyThreadId?: string | null; draftId?: string };
}

const ROLE_GROUPS = [
  { id: "admins", label: "Todos los administradores", roles: ["admin", "super_admin"] },
  { id: "docentes", label: "Todos los docentes", roles: ["maestro", "seminario_docente"] },
  { id: "estudiantes", label: "Todos los estudiantes", roles: ["seminario_estudiante"] },
  { id: "pastores", label: "Todos los pastores", roles: ["pastor"] },
];

export default function MensajeComposer({ open, onOpenChange, initial }: Props) {
  const { data: directory = [] } = useProfilesDirectory();
  const send = useSendMessage();
  const saveDraft = useSaveDraft();

  const [subject, setSubject] = useState(initial?.subject || "");
  const [body, setBody] = useState(initial?.body || "");
  const [recipients, setRecipients] = useState<string[]>(initial?.recipients || []);
  const [files, setFiles] = useState<File[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(initial?.subject || "");
      setBody(initial?.body || "");
      setRecipients(initial?.recipients || []);
      setFiles([]);
    }
  }, [open, initial?.draftId, initial?.replyThreadId]);

  const addRecipient = (id: string) => {
    setRecipients((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  const removeRecipient = (id: string) => setRecipients((prev) => prev.filter((r) => r !== id));

  const addGroup = (roles: string[]) => {
    const ids = directory.filter((u: any) => u.roles.some((r: string) => roles.includes(r))).map((u: any) => u.user_id);
    setRecipients((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const onSend = async () => {
    try {
      await send.mutateAsync({
        subject, body, recipientUserIds: recipients, files, replyThreadId: initial?.replyThreadId || null,
      });
      toast.success("Mensaje enviado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Error al enviar");
    }
  };
  const onSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync({
        id: initial?.draftId, subject, body, recipientUserIds: recipients, replyThreadId: initial?.replyThreadId || null,
      });
      toast.success("Borrador guardado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar borrador");
    }
  };

  const recipientLabel = (id: string) => directory.find((u: any) => u.user_id === id)?.display_name || id.slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.replyThreadId ? "Responder mensaje" : "Nuevo mensaje"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Recipients */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap min-h-9 border rounded-md px-2 py-1.5 bg-background">
              <Users className="h-4 w-4 text-muted-foreground" />
              {recipients.length === 0 && <span className="text-xs text-muted-foreground">Para…</span>}
              {recipients.map((r) => (
                <Badge key={r} variant="secondary" className="gap-1">
                  {recipientLabel(r)}
                  <button onClick={() => removeRecipient(r)} className="ml-1"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 text-xs">+ Agregar</Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar destinatarios…" />
                    <CommandList>
                      <CommandEmpty>Sin resultados</CommandEmpty>
                      <CommandGroup heading="Grupos rápidos">
                        {ROLE_GROUPS.map((g) => (
                          <CommandItem key={g.id} onSelect={() => addGroup(g.roles)}>
                            <Users className="h-3.5 w-3.5 mr-2" />{g.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup heading="Personas">
                        {directory.map((u: any) => (
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
            </div>
          </div>

          <Input placeholder="Asunto" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Escribe tu mensaje…" value={body} onChange={(e) => setBody(e.target.value)} rows={10} />

          {/* Attachments */}
          <div>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-primary hover:underline">
              <Paperclip className="h-4 w-4" />
              Adjuntar archivos
              <input
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,video/*"
                onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1">
                    <span className="truncate">{f.name} <span className="text-muted-foreground">({Math.round(f.size / 1024)} KB)</span></span>
                    <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onSaveDraft} disabled={saveDraft.isPending}>
            <Save className="h-4 w-4 mr-1" /> Guardar borrador
          </Button>
          <Button onClick={onSend} disabled={send.isPending}>
            <Send className="h-4 w-4 mr-1" /> Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
