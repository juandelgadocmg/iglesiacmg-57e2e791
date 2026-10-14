import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Target, Plus, Save } from 'lucide-react';

export default function MetasPage() {
  const { user, role } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [metas, setMetas] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [casas, setCasas] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    scope_type: 'GLOBAL',
    lider_id: '',
    casa_de_paz_id: '',
    discipulo_id: '',
    meta_seguimientos: 4,
    meta_etapas: 1,
    notes: '',
  });

  const monthKey = format(startOfMonth(new Date(selectedMonth + '-01')), 'yyyy-MM-dd');

  const fetchData = async () => {
    const [metasRes, leadersRes, casasRes] = await Promise.all([
      supabase.from('metas_mensuales').select('*, leaders(full_name), casas_de_paz(name)').eq('month_key', monthKey),
      supabase.from('leaders').select('id, full_name'),
      supabase.from('casas_de_paz').select('id, name'),
    ]);
    if (metasRes.data) setMetas(metasRes.data);
    if (leadersRes.data) setLeaders(leadersRes.data);
    if (casasRes.data) setCasas(casasRes.data);
  };

  useEffect(() => { fetchData(); }, [selectedMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from('metas_mensuales').insert({
      month_key: monthKey,
      scope_type: form.scope_type,
      lider_id: form.scope_type === 'LIDER' ? form.lider_id : null,
      casa_de_paz_id: form.scope_type === 'CASA' ? form.casa_de_paz_id : null,
      discipulo_id: form.scope_type === 'DISCIPULO' ? form.discipulo_id : null,
      meta_seguimientos: form.meta_seguimientos,
      meta_etapas: form.meta_etapas,
      notes: form.notes || null,
      created_by: user.id,
    });

    if (error) {
      toast.error('Error al guardar meta');
    } else {
      toast.success('Meta guardada');
      setShowForm(false);
      setForm({ scope_type: 'GLOBAL', lider_id: '', casa_de_paz_id: '', discipulo_id: '', meta_seguimientos: 4, meta_etapas: 1, notes: '' });
      fetchData();
    }
  };

  const monthLabel = format(startOfMonth(new Date(selectedMonth + '-01')), 'MMMM yyyy', { locale: es });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display text-foreground">Metas Mensuales</h1>
          <p className="text-muted-foreground text-sm capitalize">{monthLabel}</p>
        </div>
        <div className="flex gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
          />
          {role === 'ADMIN' && (
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus size={16} className="mr-1" /> Nueva meta
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Alcance</Label>
                  <Select value={form.scope_type} onValueChange={(v) => setForm({ ...form, scope_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GLOBAL">Global</SelectItem>
                      <SelectItem value="LIDER">Por líder</SelectItem>
                      <SelectItem value="CASA">Por casa de paz</SelectItem>
                      <SelectItem value="DISCIPULO">Por discípulo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.scope_type === 'LIDER' && (
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
                {form.scope_type === 'CASA' && (
                  <div>
                    <Label>Casa de Paz</Label>
                    <Select value={form.casa_de_paz_id} onValueChange={(v) => setForm({ ...form, casa_de_paz_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {casas.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Meta seguimientos</Label>
                  <Input type="number" min={0} value={form.meta_seguimientos} onChange={(e) => setForm({ ...form, meta_seguimientos: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Meta etapas</Label>
                  <Input type="number" min={0} value={form.meta_etapas} onChange={(e) => setForm({ ...form, meta_etapas: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm"><Save size={16} className="mr-1" />Guardar</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Display metas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metas.map((m) => (
          <Card key={m.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-primary" />
                <span className="text-xs font-medium text-primary uppercase">{m.scope_type}</span>
                {m.leaders && <span className="text-xs text-muted-foreground">• {(m.leaders as any).full_name}</span>}
                {m.casas_de_paz && <span className="text-xs text-muted-foreground">• {(m.casas_de_paz as any).name}</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Seguimientos</div>
                  <div className="text-lg font-bold font-display text-foreground">{m.meta_seguimientos}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Etapas</div>
                  <div className="text-lg font-bold font-display text-foreground">{m.meta_etapas}</div>
                </div>
              </div>
              {m.notes && <p className="text-xs text-muted-foreground mt-2">{m.notes}</p>}
            </CardContent>
          </Card>
        ))}
        {metas.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No hay metas configuradas para este mes
          </div>
        )}
      </div>
    </div>
  );
}
