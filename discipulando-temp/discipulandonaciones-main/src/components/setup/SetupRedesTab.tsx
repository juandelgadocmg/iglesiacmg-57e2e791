import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, Plus, Network, Pencil, Check, X } from 'lucide-react';

interface Props {
  redes: any[];
  callSetup: (body: any) => Promise<any>;
  onRefresh: () => void;
}

export function SetupRedesTab({ redes, callSetup, onRefresh }: Props) {
  const [newRedName, setNewRedName] = useState('');
  const [newRedLider, setNewRedLider] = useState('');
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLider, setEditLider] = useState('');

  const addRed = async () => {
    if (!newRedName.trim()) return;
    setLoading(true);
    try {
      await callSetup({ action: 'create_red', name: newRedName.trim(), lider_red: newRedLider.trim() || null });
      toast.success('Red creada');
      setNewRedName(''); setNewRedLider('');
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const startEdit = (r: any) => {
    setEditId(r.id);
    setEditName(r.name);
    setEditLider(r.lider_red || '');
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    try {
      await callSetup({ action: 'update_red', red_id: editId, name: editName.trim(), lider_red: editLider.trim() || null });
      toast.success('Red actualizada');
      setEditId(null);
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteRed = async (id: string) => {
    if (!confirm('¿Eliminar esta red?')) return;
    try {
      await callSetup({ action: 'delete_red', red_id: id });
      toast.success('Red eliminada');
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Network size={16} /> Crear Red</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Nombre de la red" value={newRedName} onChange={(e) => setNewRedName(e.target.value)} />
          <Input placeholder="Líder de red (opcional)" value={newRedLider} onChange={(e) => setNewRedLider(e.target.value)} />
          <Button onClick={addRed} disabled={loading} className="w-full"><Plus size={16} className="mr-1" /> Crear Red</Button>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Redes ({redes.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {redes.map((r) => (
            <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background">
              {editId === r.id ? (
                <div className="flex-1 space-y-1">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" className="h-8 text-sm" />
                  <Input value={editLider} onChange={(e) => setEditLider(e.target.value)} placeholder="Líder (opcional)" className="h-8 text-sm" />
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{r.name}</div>
                  {r.lider_red && <div className="text-[10px] text-muted-foreground">Líder: {r.lider_red}</div>}
                </div>
              )}
              {editId === r.id ? (
                <>
                  <Button size="icon" variant="ghost" onClick={saveEdit}><Check size={14} className="text-green-600" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X size={14} /></Button>
                </>
              ) : (
                <>
                  <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil size={14} /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteRed(r.id)}><Trash2 size={14} /></Button>
                </>
              )}
            </div>
          ))}
          {redes.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Sin redes</p>}
        </CardContent>
      </Card>
    </div>
  );
}
