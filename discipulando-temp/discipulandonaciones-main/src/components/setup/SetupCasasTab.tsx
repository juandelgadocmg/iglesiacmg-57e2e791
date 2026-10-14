import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, Plus, Home, Pencil, Check, X } from 'lucide-react';

interface Props {
  casas: any[];
  redes: any[];
  callSetup: (body: any) => Promise<any>;
  onRefresh: () => void;
}

export function SetupCasasTab({ casas, redes, callSetup, onRefresh }: Props) {
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newRed, setNewRed] = useState('');
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editRed, setEditRed] = useState('');

  const addCasa = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await callSetup({ action: 'create_casa', name: newName.trim(), city: newCity.trim(), red_id: newRed || null });
      toast.success('Casa de Paz creada');
      setNewName(''); setNewCity(''); setNewRed('');
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const startEdit = (c: any) => {
    setEditId(c.id);
    setEditName(c.name);
    setEditCity(c.city || '');
    setEditRed(c.red_id || '');
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    try {
      await callSetup({ action: 'update_casa', casa_id: editId, name: editName.trim(), city: editCity.trim(), red_id: editRed || null });
      toast.success('Casa de Paz actualizada');
      setEditId(null);
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteCasa = async (id: string) => {
    if (!confirm('¿Eliminar esta Casa de Paz?')) return;
    try {
      await callSetup({ action: 'delete_casa', casa_id: id });
      toast.success('Casa de Paz eliminada');
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Home size={16} /> Crear Casa de Paz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input placeholder="Ciudad (opcional)" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
          <Select value={newRed} onValueChange={setNewRed}>
            <SelectTrigger><SelectValue placeholder="Asignar a red (opcional)" /></SelectTrigger>
            <SelectContent>
              {redes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={addCasa} disabled={loading} className="w-full"><Plus size={16} className="mr-1" /> Crear Casa de Paz</Button>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Casas de Paz ({casas.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {casas.map((c) => (
            <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background">
              {editId === c.id ? (
                <div className="flex-1 space-y-1">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" className="h-8 text-sm" />
                  <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Ciudad" className="h-8 text-sm" />
                  <Select value={editRed} onValueChange={setEditRed}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Red" /></SelectTrigger>
                    <SelectContent>
                      {redes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">{c.city && `${c.city} • `}Red: {(c.redes as any)?.name || '—'}</div>
                </div>
              )}
              {editId === c.id ? (
                <>
                  <Button size="icon" variant="ghost" onClick={saveEdit}><Check size={14} className="text-green-600" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X size={14} /></Button>
                </>
              ) : (
                <>
                  <Button size="icon" variant="ghost" onClick={() => startEdit(c)}><Pencil size={14} /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteCasa(c.id)}><Trash2 size={14} /></Button>
                </>
              )}
            </div>
          ))}
          {casas.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Sin casas de paz</p>}
        </CardContent>
      </Card>
    </div>
  );
}
