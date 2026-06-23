import { useState } from "react";
import { useMsgTemplates, useSaveTemplate, useDeleteTemplate, extractVariables, type MsgTemplate } from "@/hooks/useMensajes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2, Plus, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onUse?: (t: MsgTemplate) => void;
}

export default function MensajeTemplatesPanel({ onUse }: Props) {
  const { data: templates = [], isLoading } = useMsgTemplates();
  const save = useSaveTemplate();
  const del = useDeleteTemplate();
  const [editing, setEditing] = useState<Partial<MsgTemplate> | null>(null);

  const onSave = async () => {
    if (!editing?.name || !editing.subject) return toast.error("Nombre y asunto son requeridos");
    try {
      await save.mutateAsync(editing);
      toast.success("Plantilla guardada");
      setEditing(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold">Plantillas</h3>
        <Button size="sm" onClick={() => setEditing({ name: "", subject: "", body: "", category: "general", is_shared: false, variables: [] })}>
          <Plus className="h-4 w-4 mr-1" /> Nueva
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> :
         templates.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Sin plantillas</div> :
         templates.map((t) => (
          <div key={t.id} className="p-3 border-b">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t.name}</span>
              {t.is_shared && <Badge variant="outline" className="text-[10px]">Compartida</Badge>}
              {t.category && <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>}
              <div className="flex-1" />
              {onUse && <Button size="sm" variant="outline" onClick={() => onUse(t)}>Usar</Button>}
              <Button size="sm" variant="ghost" onClick={() => setEditing(t)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="text-xs text-muted-foreground"><strong>Asunto:</strong> {t.subject}</div>
            <div className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{t.body}</div>
            {t.variables?.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {t.variables.map((v) => <Badge key={v} variant="outline" className="text-[9px]">{`{${v}}`}</Badge>)}
              </div>
            )}
          </div>
        ))}
      </ScrollArea>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Nombre" value={editing?.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input placeholder="Categoría (bienvenida, calificacion, zoom, general)" value={editing?.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            <Input placeholder="Asunto — usa {variable}" value={editing?.subject || ""} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
            <Textarea rows={8} placeholder="Cuerpo del mensaje — usa {nombre}, {curso}, {semestre}…" value={editing?.body || ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            <div className="text-xs text-muted-foreground">
              Variables detectadas: {extractVariables(`${editing?.subject || ""} ${editing?.body || ""}`).map((v) => `{${v}}`).join(", ") || "ninguna"}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!editing?.is_shared} onCheckedChange={(v) => setEditing({ ...editing, is_shared: v })} />
              <span className="text-sm">Compartir con todo el staff</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={onSave} disabled={save.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
