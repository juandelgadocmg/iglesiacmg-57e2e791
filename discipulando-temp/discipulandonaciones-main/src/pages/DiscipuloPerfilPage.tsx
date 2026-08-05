import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calcularSemaforo, ETAPAS_ORDER, ETAPAS_LABELS } from '@/lib/semaforo';
import { SemaforoDot } from '@/components/SemaforoDot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Plus, Calendar, CheckCircle } from 'lucide-react';

export default function DiscipuloPerfilPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [discipulo, setDiscipulo] = useState<any>(null);
  const [progreso, setProgreso] = useState<any[]>([]);
  const [seguimientos, setSeguimientos] = useState<any[]>([]);
  const [showSeguimientoForm, setShowSeguimientoForm] = useState(false);
  const [nuevoSeg, setNuevoSeg] = useState({ resumen: '', asistencia: '', peticiones_oracion: '', proximos_pasos: '' });

  const fetchData = async () => {
    if (!id) return;
    const [dRes, pRes, sRes] = await Promise.all([
      supabase.from('discipulos').select('*, casas_de_paz(name), leaders(full_name)').eq('id', id).maybeSingle(),
      supabase.from('progreso_discipulo').select('*').eq('discipulo_id', id),
      supabase.from('seguimientos').select('id, discipulo_id, fecha, resumen, asistencia, proximos_pasos, created_at, leaders(full_name)').eq('discipulo_id', id).order('fecha', { ascending: false }),
    ]);
    if (dRes.data) setDiscipulo(dRes.data);
    if (pRes.data) setProgreso(pRes.data);
    if (sRes.data) setSeguimientos(sRes.data);
  };

  useEffect(() => { fetchData(); }, [id]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channels = [
      supabase.channel(`disc-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'discipulos', filter: `id=eq.${id}` }, () => fetchData()).subscribe(),
      supabase.channel(`prog-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'progreso_discipulo', filter: `discipulo_id=eq.${id}` }, () => fetchData()).subscribe(),
      supabase.channel(`seg-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'seguimientos', filter: `discipulo_id=eq.${id}` }, () => fetchData()).subscribe(),
    ];
    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, [id]);

  const toggleEtapa = async (etapaCode: string, currentCompleted: boolean) => {
    if (!id || !user) return;
    const existing = progreso.find((p) => p.etapa_code === etapaCode);
    if (existing) {
      await supabase.from('progreso_discipulo').update({
        completed: !currentCompleted,
        completed_at: !currentCompleted ? new Date().toISOString() : null,
        updated_by: user.id,
      }).eq('id', existing.id);
    } else {
      await supabase.from('progreso_discipulo').insert({
        discipulo_id: id,
        etapa_code: etapaCode,
        completed: true,
        completed_at: new Date().toISOString(),
        updated_by: user.id,
      });
    }
    fetchData();
  };

  const crearSeguimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    const { error } = await supabase.from('seguimientos').insert({
      discipulo_id: id,
      resumen: nuevoSeg.resumen,
      asistencia: nuevoSeg.asistencia || null,
      peticiones_oracion: nuevoSeg.peticiones_oracion || null,
      proximos_pasos: nuevoSeg.proximos_pasos || null,
      created_by: user.id,
    });
    if (error) {
      toast.error('Error al crear seguimiento');
    } else {
      toast.success('Seguimiento registrado');
      setNuevoSeg({ resumen: '', asistencia: '', peticiones_oracion: '', proximos_pasos: '' });
      setShowSeguimientoForm(false);
      fetchData();
    }
  };

  if (!discipulo) {
    return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  }

  const completadas = progreso.filter((p) => p.completed).length;
  const diasSinAct = discipulo.last_update_at
    ? differenceInDays(new Date(), new Date(discipulo.last_update_at))
    : null;

  const semaforo = calcularSemaforo({
    status: discipulo.status,
    startDate: discipulo.start_date,
    progreso,
  });

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft size={16} /> Volver al dashboard
      </Link>

      {/* Header */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold font-display">
              {discipulo.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-display font-bold text-foreground">{discipulo.full_name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                <span>{(discipulo.casas_de_paz as any)?.name || 'Sin casa de paz'}</span>
                <span>•</span>
                <span>Líder: {(discipulo.leaders as any)?.full_name || '—'}</span>
                <span>•</span>
                <span>{discipulo.status}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SemaforoDot color={semaforo} size="lg" showLabel pulse={semaforo === 'rojo'} />
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {diasSinAct !== null
              ? `Actualizado hace ${diasSinAct} día${diasSinAct !== 1 ? 's' : ''}`
              : 'Sin actualizaciones registradas'}
            {' • '}Progreso: {completadas}/{ETAPAS_ORDER.length} etapas ({Math.round((completadas / ETAPAS_ORDER.length) * 100)}%)
          </div>
        </CardContent>
      </Card>

      {/* Progreso de etapas */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <CheckCircle size={18} className="text-secondary" />
            Progreso de Discipulado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ETAPAS_ORDER.map((code) => {
              const p = progreso.find((pr) => pr.etapa_code === code);
              const done = p?.completed || false;
              return (
                <button
                  key={code}
                  onClick={() => toggleEtapa(code, done)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    done
                      ? 'bg-secondary/10 border-secondary'
                      : 'bg-card border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <Checkbox checked={done} className="pointer-events-none" />
                  <div>
                    <div className="font-medium text-sm text-foreground">{code}</div>
                    <div className="text-xs text-muted-foreground">{ETAPAS_LABELS[code]}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Seguimientos */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Calendar size={18} className="text-accent" />
            Seguimientos
          </CardTitle>
          <Button size="sm" onClick={() => setShowSeguimientoForm(!showSeguimientoForm)}>
            <Plus size={16} className="mr-1" />
            Nuevo
          </Button>
        </CardHeader>
        <CardContent>
          {showSeguimientoForm && (
            <form onSubmit={crearSeguimiento} className="mb-6 p-4 bg-muted rounded-lg space-y-3">
              <div>
                <Label>Resumen *</Label>
                <Textarea
                  value={nuevoSeg.resumen}
                  onChange={(e) => setNuevoSeg({ ...nuevoSeg, resumen: e.target.value })}
                  placeholder="¿Cómo fue la reunión?"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Asistencia</Label>
                  <Input
                    value={nuevoSeg.asistencia}
                    onChange={(e) => setNuevoSeg({ ...nuevoSeg, asistencia: e.target.value })}
                    placeholder="Presencial / Virtual"
                  />
                </div>
                <div>
                  <Label>Peticiones de oración</Label>
                  <Input
                    value={nuevoSeg.peticiones_oracion}
                    onChange={(e) => setNuevoSeg({ ...nuevoSeg, peticiones_oracion: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Próximos pasos</Label>
                <Textarea
                  value={nuevoSeg.proximos_pasos}
                  onChange={(e) => setNuevoSeg({ ...nuevoSeg, proximos_pasos: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Guardar</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowSeguimientoForm(false)}>Cancelar</Button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {seguimientos.map((s) => (
              <div key={s.id} className="border-l-2 border-accent pl-4 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar size={12} />
                  {format(new Date(s.fecha), 'dd MMMM yyyy', { locale: es })}
                  {s.leaders && <span>• {(s.leaders as any).full_name}</span>}
                </div>
                <p className="text-sm text-foreground">{s.resumen}</p>
                {s.peticiones_oracion && (
                  <p className="text-xs text-muted-foreground mt-1">🙏 {s.peticiones_oracion}</p>
                )}
                {s.proximos_pasos && (
                  <p className="text-xs text-muted-foreground mt-1">📋 {s.proximos_pasos}</p>
                )}
              </div>
            ))}
            {seguimientos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay seguimientos registrados aún
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
