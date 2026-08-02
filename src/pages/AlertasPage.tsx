import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, AlertCircle, Info, ShieldAlert, Check, Archive, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const SEV = {
  critica: { label: "Crítica", icon: ShieldAlert, cls: "bg-destructive text-destructive-foreground", ring: "border-l-destructive" },
  alta:    { label: "Alta",    icon: AlertTriangle, cls: "bg-orange-500 text-white",             ring: "border-l-orange-500" },
  media:   { label: "Media",   icon: AlertCircle,   cls: "bg-amber-400 text-black",              ring: "border-l-amber-400" },
  baja:    { label: "Baja",    icon: Info,          cls: "bg-sky-500 text-white",                ring: "border-l-sky-500" },
} as const;
type Sev = keyof typeof SEV;

export default function AlertasPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pendiente" | "leida" | "resuelta" | "archivada">("pendiente");
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ titulo: "", descripcion: "", severidad: "media" as Sev, categoria: "" });

  const { data: alertas = [], isLoading } = useQuery({
    queryKey: ["alertas", tab],
    queryFn: async () => {
      const { data, error } = await supabase.from("alertas_importantes" as any)
        .select("*").eq("estado", tab)
        .order("severidad", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const counts = useQuery({
    queryKey: ["alertas-counts"],
    queryFn: async () => {
      const states = ["pendiente", "leida", "resuelta", "archivada"];
      const results = await Promise.all(states.map(s =>
        supabase.from("alertas_importantes" as any).select("id", { count: "exact", head: true }).eq("estado", s)
      ));
      return Object.fromEntries(states.map((s, i) => [s, results[i].count || 0])) as Record<string, number>;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sin sesión");
      const { error } = await supabase.from("alertas_importantes" as any).insert({
        titulo: form.titulo, descripcion: form.descripcion || null,
        severidad: form.severidad, categoria: form.categoria || null,
        created_by: user.id, created_by_email: user.email,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alerta creada");
      setOpenNew(false); setForm({ titulo: "", descripcion: "", severidad: "media", categoria: "" });
      qc.invalidateQueries({ queryKey: ["alertas"] }); qc.invalidateQueries({ queryKey: ["alertas-counts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const patch: any = { estado };
      if (estado === "leida") patch.read_at = new Date().toISOString();
      if (estado === "resuelta") patch.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("alertas_importantes" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alertas"] }); qc.invalidateQueries({ queryKey: ["alertas-counts"] }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alertas_importantes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Eliminada"); qc.invalidateQueries({ queryKey: ["alertas"] }); qc.invalidateQueries({ queryKey: ["alertas-counts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const sorted = useMemo(() => {
    const order: Sev[] = ["critica", "alta", "media", "baja"];
    return [...alertas].sort((a, b) => order.indexOf(a.severidad) - order.indexOf(b.severidad));
  }, [alertas]);

  return (
    <div className="animate-fade-in space-y-5 max-w-5xl mx-auto">
      <PageHeader title="Alertas importantes" description="Bandeja priorizada por severidad" variant="seguridad">
        <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-2" />Nueva alerta</Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full overflow-x-auto no-scrollbar flex justify-start">
          {(["pendiente","leida","resuelta","archivada"] as const).map(s => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s} <Badge variant="secondary" className="ml-2">{counts.data?.[s] ?? 0}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && <p className="text-muted-foreground">Cargando…</p>}
      {!isLoading && sorted.length === 0 && <p className="text-muted-foreground">Sin alertas en este estado.</p>}

      <div className="space-y-3">
        {sorted.map(a => {
          const sev = SEV[a.severidad as Sev];
          const Icon = sev.icon;
          return (
            <Card key={a.id} className={cn("p-4 border-l-4", sev.ring)}>
              <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                <div className={cn("h-11 w-11 rounded-lg flex items-center justify-center shrink-0", sev.cls)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{a.titulo}</h3>
                    <Badge variant="outline" className="text-xs">{sev.label}</Badge>
                    {a.categoria && <Badge variant="secondary" className="text-xs">{a.categoria}</Badge>}
                  </div>
                  {a.descripcion && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.descripcion}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {a.created_by_email || "—"} · {formatDistanceToNow(new Date(a.created_at), { locale: es, addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {tab === "pendiente" && <Button size="sm" variant="outline" onClick={() => setEstado.mutate({ id: a.id, estado: "leida" })} aria-label="Marcar como leída"><Check className="h-4 w-4" /></Button>}
                  {tab !== "resuelta" && tab !== "archivada" && <Button size="sm" variant="outline" onClick={() => setEstado.mutate({ id: a.id, estado: "resuelta" })}>Resolver</Button>}
                  {tab !== "archivada" && <Button size="sm" variant="ghost" onClick={() => setEstado.mutate({ id: a.id, estado: "archivada" })} aria-label="Archivar"><Archive className="h-4 w-4" /></Button>}
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(a.id)} aria-label="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva alerta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
            <Textarea placeholder="Descripción" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.severidad} onValueChange={v => setForm({ ...form, severidad: v as Sev })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SEV) as Sev[]).map(s => <SelectItem key={s} value={s}>{SEV[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Categoría (opcional)" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={() => create.mutate()} disabled={!form.titulo || create.isPending}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
