import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Cake, Bell, BellOff, Search, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInCalendarDays, addYears, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

type Persona = {
  id: string; nombres: string; apellidos: string; foto_url: string | null;
  fecha_nacimiento: string | null; telefono: string | null; tipo_persona: string | null;
};

function nextBirthday(dob: string) {
  const d = new Date(dob);
  const today = new Date(); today.setHours(0,0,0,0);
  const y = today.getFullYear();
  let next = new Date(y, d.getMonth(), d.getDate());
  if (next < today) next = addYears(next, 1);
  return next;
}

export default function CumpleanosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Persona | null>(null);
  const [nota, setNota] = useState("");
  const [dias, setDias] = useState(3);

  const { data: personas = [] } = useQuery({
    queryKey: ["cumples-personas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personas")
        .select("id,nombres,apellidos,foto_url,fecha_nacimiento,telefono,tipo_persona")
        .not("fecha_nacimiento", "is", null)
        .limit(2000);
      if (error) throw error;
      return data as Persona[];
    },
  });

  const { data: recordatorios = [] } = useQuery({
    queryKey: ["cumple-recordatorios", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("cumple_recordatorios" as any).select("*").eq("created_by", user!.id);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const saveRecordatorio = useMutation({
    mutationFn: async () => {
      if (!selected || !user) return;
      const { error } = await supabase.from("cumple_recordatorios" as any).upsert({
        persona_id: selected.id,
        nota,
        recordar_dias_antes: dias,
        activo: true,
        created_by: user.id,
        created_by_email: user.email,
      } as any, { onConflict: "persona_id,created_by" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recordatorio guardado");
      qc.invalidateQueries({ queryKey: ["cumple-recordatorios"] });
      setSelected(null); setNota(""); setDias(3);
    },
    onError: (e: any) => toast.error(e.message || "No se pudo guardar"),
  });

  const deleteRec = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cumple_recordatorios" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Eliminado");
      qc.invalidateQueries({ queryKey: ["cumple-recordatorios"] });
    },
  });

  const withDates = useMemo(() => {
    return personas
      .map(p => ({ persona: p, next: nextBirthday(p.fecha_nacimiento!) }))
      .filter(x => {
        if (!q) return true;
        const s = `${x.persona.nombres} ${x.persona.apellidos}`.toLowerCase();
        return s.includes(q.toLowerCase());
      })
      .sort((a, b) => a.next.getTime() - b.next.getTime());
  }, [personas, q]);

  const today = new Date(); today.setHours(0,0,0,0);
  const hoy = withDates.filter(x => isSameDay(x.next, today));
  const semana = withDates.filter(x => { const d = differenceInCalendarDays(x.next, today); return d > 0 && d <= 7; });
  const mes = withDates.filter(x => { const d = differenceInCalendarDays(x.next, today); return d > 7 && d <= 31; });

  const recPersonaIds = new Set(recordatorios.map((r: any) => r.persona_id));

  const Card1 = ({ persona, next }: { persona: Persona; next: Date }) => {
    const d = differenceInCalendarDays(next, today);
    const has = recPersonaIds.has(persona.id);
    return (
      <Card className="p-4 flex items-center gap-3">
        <Avatar className="h-12 w-12">
          {persona.foto_url && <AvatarImage src={persona.foto_url} />}
          <AvatarFallback>{persona.nombres?.[0]}{persona.apellidos?.[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{persona.nombres} {persona.apellidos}</p>
          <p className="text-xs text-muted-foreground">
            {format(next, "EEEE d MMMM", { locale: es })} · {d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`}
          </p>
        </div>
        <Button
          size="sm"
          variant={has ? "secondary" : "outline"}
          onClick={() => { setSelected(persona); const r = recordatorios.find((x: any) => x.persona_id === persona.id); setNota(r?.nota || ""); setDias(r?.recordar_dias_antes ?? 3); }}
          aria-label={has ? "Editar recordatorio" : "Agregar recordatorio"}
        >
          {has ? <Bell className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span className="hidden sm:inline ml-2">{has ? "Recordatorio" : "Recordar"}</span>
        </Button>
      </Card>
    );
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl mx-auto">
      <PageHeader title="Cumpleaños" description="Próximos cumpleaños y recordatorios para el equipo" variant="personas" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground uppercase">Hoy</p><p className="text-3xl font-bold text-primary">{hoy.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground uppercase">Esta semana</p><p className="text-3xl font-bold">{semana.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground uppercase">Próximos 30 días</p><p className="text-3xl font-bold">{mes.length}</p></Card>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar persona…" className="max-w-md" />
      </div>

      <Tabs defaultValue="proximos">
        <TabsList>
          <TabsTrigger value="proximos">Próximos</TabsTrigger>
          <TabsTrigger value="recordatorios">
            Mis recordatorios <Badge variant="secondary" className="ml-2">{recordatorios.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proximos" className="space-y-4 mt-4">
          {hoy.length > 0 && <section><h2 className="font-semibold mb-2 flex items-center gap-2"><Cake className="h-5 w-5 text-primary" /> Hoy</h2><div className="grid sm:grid-cols-2 gap-3">{hoy.map(x => <Card1 key={x.persona.id} {...x} />)}</div></section>}
          <section><h2 className="font-semibold mb-2">Esta semana</h2><div className="grid sm:grid-cols-2 gap-3">{semana.map(x => <Card1 key={x.persona.id} {...x} />)}</div></section>
          <section><h2 className="font-semibold mb-2">Próximos 30 días</h2><div className="grid sm:grid-cols-2 gap-3">{mes.map(x => <Card1 key={x.persona.id} {...x} />)}</div></section>
        </TabsContent>

        <TabsContent value="recordatorios" className="mt-4">
          {recordatorios.length === 0 && <p className="text-muted-foreground">Aún no has creado recordatorios.</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            {recordatorios.map((r: any) => {
              const p = personas.find(x => x.id === r.persona_id);
              if (!p) return null;
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11"><AvatarFallback>{p.nombres?.[0]}{p.apellidos?.[0]}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.nombres} {p.apellidos}</p>
                      <p className="text-xs text-muted-foreground">Avisar {r.recordar_dias_antes} día(s) antes</p>
                      {r.nota && <p className="text-sm mt-1">{r.nota}</p>}
                    </div>
                    <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => deleteRec.mutate(r.id)}>
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recordatorio para {selected?.nombres} {selected?.apellidos}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Avisarme (días antes)</label>
              <Input type="number" min={0} max={30} value={dias} onChange={e => setDias(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">Nota</label>
              <Textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej. Llamar en la mañana, enviar tarjeta..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={() => saveRecordatorio.mutate()} disabled={saveRecordatorio.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
