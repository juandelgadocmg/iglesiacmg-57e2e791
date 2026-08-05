import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, Plus, UserPlus, Users, Copy, Pencil, Check, X, KeyRound } from 'lucide-react';

interface Props {
  leaders: any[];
  discipulos: any[];
  casas: any[];
  callSetup: (body: any) => Promise<any>;
  onRefresh: () => void;
}

export function SetupLideresTab({ leaders, discipulos, casas, callSetup, onRefresh }: Props) {
  const [newLeader, setNewLeader] = useState('');
  const [newLeaderCasa, setNewLeaderCasa] = useState('');
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCasa, setEditCasa] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'sin_discipulos'>('all');

  const leadersWithCounts = useMemo(() => {
    const discipulosPorLider = new Map<string, number>();
    discipulos.forEach((d) => {
      if (!d.lider_id) return;
      discipulosPorLider.set(d.lider_id, (discipulosPorLider.get(d.lider_id) || 0) + 1);
    });

    return leaders.map((l) => ({
      ...l,
      discipulosCount: discipulosPorLider.get(l.id) || 0,
    }));
  }, [leaders, discipulos]);

  const visibleLeaders = useMemo(() => {
    if (filterMode === 'sin_discipulos') {
      return leadersWithCounts.filter((l) => l.discipulosCount === 0);
    }
    return leadersWithCounts;
  }, [leadersWithCounts, filterMode]);

  const addLeader = async () => {
    if (!newLeader.trim()) return;
    setLoading(true);
    try {
      await callSetup({ action: 'create_leader', full_name: newLeader.trim(), casa_de_paz_id: newLeaderCasa || null });
      toast.success('Líder creado');
      setNewLeader(''); setNewLeaderCasa('');
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const startEdit = (l: any) => {
    setEditId(l.id);
    setEditName(l.full_name);
    setEditCasa(l.casa_de_paz_id || '');
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    try {
      await callSetup({ action: 'update_leader', leader_id: editId, full_name: editName.trim(), casa_de_paz_id: editCasa || null });
      toast.success('Líder actualizado');
      setEditId(null);
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteLeader = async (id: string) => {
    if (!confirm('¿Eliminar líder y todos sus discípulos?')) return;
    try {
      await callSetup({ action: 'delete_leader', leader_id: id });
      toast.success('Líder eliminado');
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const generateToken = async (id: string) => {
    try {
      await callSetup({ action: 'generate_token', leader_id: id });
      toast.success('Token generado');
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/actualizar-lider/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado al portapapeles');
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><UserPlus size={16} /> Crear Líder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Nombre del líder" value={newLeader} onChange={(e) => setNewLeader(e.target.value)} />
          <Select value={newLeaderCasa} onValueChange={setNewLeaderCasa}>
            <SelectTrigger><SelectValue placeholder="Asignar a Casa de Paz (opcional)" /></SelectTrigger>
            <SelectContent>
              {casas.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={addLeader} disabled={loading} className="w-full"><Plus size={16} className="mr-1" /> Crear Líder</Button>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2"><Users size={16} /> Líderes ({visibleLeaders.length})</CardTitle>
            <Select value={filterMode} onValueChange={(v) => setFilterMode(v as 'all' | 'sin_discipulos')}>
              <SelectTrigger className="w-full sm:w-52 h-8 text-xs"><SelectValue placeholder="Filtrar líderes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sin_discipulos">Sin discípulos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleLeaders.map((l) => (
            <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background">
              {editId === l.id ? (
                <div className="flex-1 space-y-1">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" className="h-8 text-sm" />
                  <Select value={editCasa} onValueChange={setEditCasa}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Casa de Paz" /></SelectTrigger>
                    <SelectContent>
                      {casas.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{l.full_name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    Casa: {(l.casas_de_paz as any)?.name || '—'} • Discípulos: {l.discipulosCount} • Token: {l.update_token ? '✓' : 'N/A'}
                  </div>
                </div>
              )}
              {editId === l.id ? (
                <>
                  <Button size="icon" variant="ghost" onClick={saveEdit}><Check size={14} className="text-semaforo-verde" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X size={14} /></Button>
                </>
              ) : (
                <>
                  {l.update_token ? (
                    <Button size="icon" variant="ghost" onClick={() => copyLink(l.update_token)} title="Copiar link"><Copy size={14} /></Button>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => generateToken(l.id)} title="Generar token"><KeyRound size={14} className="text-accent" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => startEdit(l)}><Pencil size={14} /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteLeader(l.id)}><Trash2 size={14} /></Button>
                </>
              )}
            </div>
          ))}
          {visibleLeaders.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No hay líderes para este filtro</p>}
        </CardContent>
      </Card>
    </div>
  );
}

