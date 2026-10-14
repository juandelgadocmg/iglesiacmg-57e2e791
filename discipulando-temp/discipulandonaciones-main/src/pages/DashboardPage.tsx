import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calcularSemaforo, SemaforoColor, ETAPAS_ORDER } from '@/lib/semaforo';
import { SemaforoDot } from '@/components/SemaforoDot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Discipulo {
  id: string;
  full_name: string;
  status: string;
  start_date: string | null;
  last_update_at: string | null;
  casa_de_paz_id: string | null;
  lider_id: string | null;
  casas_de_paz?: { name: string } | null;
  leaders?: { full_name: string } | null;
}

interface ProgresoItem {
  discipulo_id: string;
  etapa_code: string;
  completed: boolean;
  completed_at: string | null;
}

interface SeguimientoCount {
  discipulo_id: string;
  count: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [discipulos, setDiscipulos] = useState<Discipulo[]>([]);
  const [progreso, setProgreso] = useState<ProgresoItem[]>([]);
  const [seguimientoCounts, setSeguimientoCounts] = useState<SeguimientoCount[]>([]);
  const [metas, setMetas] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterSemaforo, setFilterSemaforo] = useState<SemaforoColor | 'todos'>('todos');
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const monthStart = useMemo(() => startOfMonth(new Date(selectedMonth + '-01')), [selectedMonth]);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);

  const fetchData = async () => {
    const [discRes, progRes, metasRes] = await Promise.all([
      supabase.from('discipulos').select('*, casas_de_paz(name), leaders(full_name)'),
      supabase.from('progreso_discipulo').select('discipulo_id, etapa_code, completed, completed_at'),
      supabase.from('metas_mensuales').select('*').eq('month_key', format(monthStart, 'yyyy-MM-dd')),
    ]);

    if (discRes.data) setDiscipulos(discRes.data as any);
    if (progRes.data) setProgreso(progRes.data);
    if (metasRes.data) setMetas(metasRes.data);

    // Count seguimientos per discipulo for this month
    const { data: segs } = await supabase
      .from('seguimientos')
      .select('discipulo_id')
      .gte('fecha', format(monthStart, 'yyyy-MM-dd'))
      .lte('fecha', format(monthEnd, 'yyyy-MM-dd'));

    if (segs) {
      const counts: Record<string, number> = {};
      segs.forEach((s) => {
        counts[s.discipulo_id] = (counts[s.discipulo_id] || 0) + 1;
      });
      setSeguimientoCounts(
        Object.entries(counts).map(([discipulo_id, count]) => ({ discipulo_id, count }))
      );
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  // Realtime subscriptions
  useEffect(() => {
    const channels = [
      supabase.channel('discipulos-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'discipulos' }, () => fetchData()).subscribe(),
      supabase.channel('progreso-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'progreso_discipulo' }, () => fetchData()).subscribe(),
      supabase.channel('seguimientos-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'seguimientos' }, () => fetchData()).subscribe(),
    ];
    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, []);

  // Compute semáforo for each discipulo
  const discipulosConSemaforo = useMemo(() => {
    return discipulos.map((d) => {
      const progresoDisc = progreso.filter((p) => p.discipulo_id === d.id);
      const completadas = progresoDisc.filter((p) => p.completed).length;
      const segsMes = seguimientoCounts.find((s) => s.discipulo_id === d.id)?.count || 0;
      const etapasMes = progresoDisc.filter(
        (p) => p.completed && p.completed_at && new Date(p.completed_at) >= monthStart && new Date(p.completed_at) <= monthEnd
      ).length;

      // Get meta (herencia)
      const metaDisc = metas.find((m) => m.scope_type === 'DISCIPULO' && m.discipulo_id === d.id);
      const metaLider = metas.find((m) => m.scope_type === 'LIDER' && m.lider_id === d.lider_id);
      const metaCasa = metas.find((m) => m.scope_type === 'CASA' && m.casa_de_paz_id === d.casa_de_paz_id);
      const metaGlobal = metas.find((m) => m.scope_type === 'GLOBAL');
      const meta = metaDisc || metaCasa || metaLider || metaGlobal;

      const cumplSeg = meta?.meta_seguimientos ? segsMes / meta.meta_seguimientos : 0;
      const cumplEtapas = meta?.meta_etapas ? etapasMes / meta.meta_etapas : 0;

      const semaforo = calcularSemaforo({
        status: d.status,
        startDate: d.start_date,
        progreso: progresoDisc,
      });

      return { ...d, semaforo, completadas, segsMes, etapasMes, cumplSeg, cumplEtapas, totalEtapas: ETAPAS_ORDER.length, progresoDisc };
    });
  }, [discipulos, progreso, seguimientoCounts, metas, monthStart, monthEnd]);

  // Filter
  const filtered = useMemo(() => {
    return discipulosConSemaforo.filter((d) => {
      if (filterSemaforo !== 'todos' && d.semaforo !== filterSemaforo) return false;
      if (search && !d.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [discipulosConSemaforo, filterSemaforo, search]);

  // KPIs
  const kpis = useMemo(() => {
    const activos = discipulosConSemaforo.filter((d) => d.status === 'Activo');
    const verde = activos.filter((d) => d.semaforo === 'verde').length;
    const amarillo = activos.filter((d) => d.semaforo === 'amarillo').length;
    const rojo = activos.filter((d) => d.semaforo === 'rojo').length;
    const sinActualizar = activos.filter(
      (d) => !d.last_update_at || new Date().getTime() - new Date(d.last_update_at).getTime() > 14 * 86400000
    ).length;
    const totalSegsMes = discipulosConSemaforo.reduce((acc, d) => acc + d.segsMes, 0);
    const totalEtapasMes = discipulosConSemaforo.reduce((acc, d) => acc + d.etapasMes, 0);

    const metaGlobal = metas.find((m) => m.scope_type === 'GLOBAL');
    const metaSegTotal = metaGlobal?.meta_seguimientos ? metaGlobal.meta_seguimientos * activos.length : activos.length * 4;
    const metaEtapasTotal = metaGlobal?.meta_etapas ? metaGlobal.meta_etapas * activos.length : activos.length;

    return { verde, amarillo, rojo, sinActualizar, totalSegsMes, totalEtapasMes, metaSegTotal, metaEtapasTotal };
  }, [discipulosConSemaforo, metas]);

  const monthLabel = format(monthStart, 'MMMM yyyy', { locale: es });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm capitalize">{monthLabel}</p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-secondary" />
              <span className="text-xs text-muted-foreground">Seguimientos</span>
            </div>
            <div className="text-2xl font-bold font-display text-foreground">
              {kpis.totalSegsMes}<span className="text-muted-foreground text-sm font-normal">/{kpis.metaSegTotal}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {kpis.metaSegTotal > 0 ? Math.round((kpis.totalSegsMes / kpis.metaSegTotal) * 100) : 0}% cumplimiento
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-secondary" />
              <span className="text-xs text-muted-foreground">Etapas completadas</span>
            </div>
            <div className="text-2xl font-bold font-display text-foreground">
              {kpis.totalEtapasMes}<span className="text-muted-foreground text-sm font-normal">/{kpis.metaEtapasTotal}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {kpis.metaEtapasTotal > 0 ? Math.round((kpis.totalEtapasMes / kpis.metaEtapasTotal) * 100) : 0}% cumplimiento
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">Semáforo</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold font-display">
              <span className="flex items-center gap-1"><SemaforoDot color="verde" size="sm" />{kpis.verde}</span>
              <span className="flex items-center gap-1"><SemaforoDot color="amarillo" size="sm" />{kpis.amarillo}</span>
              <span className="flex items-center gap-1"><SemaforoDot color="rojo" size="sm" />{kpis.rojo}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-destructive" />
              <span className="text-xs text-muted-foreground">Sin actualizar 14d</span>
            </div>
            <div className="text-2xl font-bold font-display text-destructive">{kpis.sinActualizar}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar discípulo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['todos', 'verde', 'amarillo', 'rojo', 'gris', 'azul'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSemaforo(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterSemaforo === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'todos' ? 'Todos' : <div className="flex items-center gap-1"><SemaforoDot color={s} size="sm" />{s.charAt(0).toUpperCase() + s.slice(1)}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="p-3">Estado</th>
              <th className="p-3">Nombre</th>
              <th className="p-3 hidden md:table-cell">Casa de Paz</th>
              <th className="p-3 hidden md:table-cell">Líder</th>
              <th className="p-3">Progreso</th>
              <th className="p-3 hidden lg:table-cell">Seg. mes</th>
              <th className="p-3 hidden lg:table-cell">Última act.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <SemaforoDot color={d.semaforo} showLabel size="md" />
                </td>
                <td className="p-3">
                  <Link to={`/discipulo/${d.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                    {d.full_name}
                  </Link>
                  <div className="text-xs text-muted-foreground md:hidden">
                    {(d.casas_de_paz as any)?.name}
                  </div>
                </td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">
                  {(d.casas_de_paz as any)?.name || '—'}
                </td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">
                  {(d.leaders as any)?.full_name || '—'}
                </td>
                <td className="p-3">
                  <div className="flex gap-0.5 flex-wrap">
                    {ETAPAS_ORDER.map((code) => {
                      const done = d.progresoDisc.some((p) => p.etapa_code === code && p.completed);
                      return (
                        <span
                          key={code}
                          title={code}
                          className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                            done ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {code.charAt(0)}
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {d.completadas}/{d.totalEtapas} ({Math.round((d.completadas / d.totalEtapas) * 100)}%)
                  </div>
                </td>
                <td className="p-3 hidden lg:table-cell text-muted-foreground">{d.segsMes}</td>
                <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground">
                  {d.last_update_at ? (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {format(new Date(d.last_update_at), 'dd MMM', { locale: es })}
                    </div>
                  ) : (
                    <span className="text-destructive">Sin datos</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No se encontraron discípulos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
