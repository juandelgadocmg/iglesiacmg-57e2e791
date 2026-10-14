import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, Plus, UserPlus, Pencil, Check, X } from 'lucide-react';

interface Props {
  discipulos: any[];
  leaders: any[];
  casas: any[];
  callSetup: (body: any) => Promise<any>;
  onRefresh: () => void;
}

export function SetupDiscipulosTab({ discipulos, leaders, casas, callSetup, onRefresh }: Props) {
  const [newDisc, setNewDisc] = useState('');
  const [selectedLider, setSelectedLider] = useState('');
  const [newDiscCasa, setNewDiscCasa] = useState('');
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLider, setEditLider] = useState('');
  const [editCasa, setEditCasa] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const addDiscipulo = async () => {
    if (!newDisc.trim() || !selectedLider) return;
    setLoading(true);
    try {
      await callSetup({ action: 'create_discipulo', full_name: newDisc.trim(), lider_id: selectedLider, casa_de_paz_id: newDiscCasa || null });
      toast.success('Discípulo creado');
      setNewDisc(''); setNewDiscCasa('');
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const startEdit = (d: any) => {
    setEditId(d.id);
    setEditName(d.full_name);
    setEditLider(d.lider_id || '');
    setEditCasa(d.casa_de_paz_id || '');
    setEditStatus(d.status || 'Activo');
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    try {
      await callSetup({ action: 'update_discipulo', discipulo_id: editId, full_name: editName.trim(), lider_id: editLider || null, casa_de_paz_id: editCasa || null, status: editStatus });
      toast.success('Discípulo actualizado');
      setEditId(null);
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteDiscipulo = async (id: string) => {
    if (!confirm('¿Eliminar discípulo?')) return;
    try {
      await callSetup({ action: 'delete_discipulo', discipulo_id: id });
      toast.success('Discípulo eliminado');
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><UserPlus size={16} /> Crear Discípulo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Nombre del discípulo" value={newDisc} onChange={(e) => setNewDisc(e.target.value)} />
          <Select value={selectedLider} onValueChange={setSelectedLider}>
            <SelectTrigger><SelectValue placeholder="Asignar a líder..." /></SelectTrigger>
            <SelectContent>
              {leaders.map((l) => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={newDiscCasa} onValueChange={setNewDiscCasa}>
            <SelectTrigger><SelectValue placeholder="Casa de Paz (opcional)" /></SelectTrigger>
            <SelectContent>
              {casas.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={addDiscipulo} disabled={loading || !selectedLider} className="w-full">
            <Plus size={16} className="mr-1" /> Crear Discípulo
          </Button>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Discípulos ({discipulos.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {discipulos.map((d) => (
            <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background">
              {editId === d.id ? (
                <div className="flex-1 space-y-1">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" className="h-8 text-sm" />
                  <Select value={editLider} onValueChange={setEditLider}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Líder" /></SelectTrigger>
                    <SelectContent>
                      {leaders.map((l) => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={editCasa} onValueChange={setEditCasa}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Casa de Paz" /></SelectTrigger>
                    <SelectContent>
                      {casas.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="En pausa">En pausa</SelectItem>
                      <SelectItem value="Completado">Completado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.full_name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Líder: {(d.leaders as any)?.full_name || '—'} • Casa: {(d.casas_de_paz as any)?.name || '—'} • {d.status}
                  </div>
                </div>
              )}
              {editId === d.id ? (
                <>
                  <Button size="icon" variant="ghost" onClick={saveEdit}><Check size={14} className="text-green-600" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X size={14} /></Button>
                </>
              ) : (
                <>
                  <Button size="icon" variant="ghost" onClick={() => startEdit(d)}><Pencil size={14} /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteDiscipulo(d.id)}><Trash2 size={14} /></Button>
                </>
              )}
            </div>
          ))}
          {discipulos.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Sin discípulos</p>}
        </CardContent>
      </Card>
    </div>
  );
}
