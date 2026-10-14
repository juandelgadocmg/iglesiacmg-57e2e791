import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { SemaforoDot } from '@/components/SemaforoDot';
import { calcularSemaforo } from '@/lib/semaforo';

export default function DiscipulosPage() {
  const { user, role } = useAuth();
  const [discipulos, setDiscipulos] = useState<any[]>([]);
  const [casas, setCasas] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    full_name: '', casa_de_paz_id: '', lider_id: '', status: 'Activo', notes: '',
  });

  const fetchData = async () => {
    const [dRes, cRes, lRes] = await Promise.all([
      supabase.from('discipulos').select('*, casas_de_paz(name), leaders(full_name)'),
      supabase.from('casas_de_paz').select('id, name'),
      supabase.from('leaders').select('id, full_name'),
    ]);
    if (dRes.data) setDiscipulos(dRes.data);
    if (cRes.data) setCasas(cRes.data);
    if (lRes.data) setLeaders(lRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('discipulos').insert({
      full_name: form.full_name,
      casa_de_paz_id: form.casa_de_paz_id || null,
      lider_id: form.lider_id || user.id,
      status: form.status,
      notes: form.notes || null,
      start_date: new Date().toISOString().split('T')[0],
    });
    if (error) {
      toast.error('Error al crear discípulo');
    } else {
      toast.success('Discípulo registrado');
      setShowForm(false);
      setForm({ full_name: '', casa_de_paz_id: '', lider_id: '', status: 'Activo', notes: '' });
      fetchData();
    }
  };

  const filtered = discipulos.filter((d) =>
    d.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display text-foreground">Discípulos</h1>
          <p className="text-muted-foreground text-sm">{discipulos.length} registrados</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={16} className="mr-1" /> Nuevo discípulo
        </Button>
      </div>

      {showForm && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre completo *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div>
                  <Label>Casa de Paz</Label>
                  <Select value={form.casa_de_paz_id} onValueChange={(v) => setForm({ ...form, casa_de_paz_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {casas.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {role === 'ADMIN' && (
                  <div>
                    <Label>Líder</Label>
                    <Select value={form.lider_id} onValueChange={(v) => setForm({ ...form, lider_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {leaders.map((l) => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Estado</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="En pausa">En pausa</SelectItem>
                      <SelectItem value="Completado">Completado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Observaciones</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Guardar</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((d) => {
          const semaforo = calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: [] });
          return (
            <Link key={d.id} to={`/discipulo/${d.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display font-bold text-foreground">{d.full_name}</h3>
                    <SemaforoDot color={semaforo} size="md" />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{(d.casas_de_paz as any)?.name || 'Sin casa de paz'}</p>
                    <p>Líder: {(d.leaders as any)?.full_name || '—'}</p>
                    <p>Estado: {d.status}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No se encontraron discípulos</div>
      )}
    </div>
  );
}
