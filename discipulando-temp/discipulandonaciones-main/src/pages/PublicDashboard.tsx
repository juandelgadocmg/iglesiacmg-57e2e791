import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/PublicLayout';
import { DiscipuloCard } from '@/components/DiscipuloCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calcularSemaforo, ETAPAS_ORDER, SemaforoColor } from '@/lib/semaforo';
import { SemaforoDot } from '@/components/SemaforoDot';
import { Search, Users, ChevronRight, Network, Home } from 'lucide-react';

export default function PublicDashboard() {
  const [redes, setRedes] = useState<any[]>([]);
  const [casas, setCasas] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [discipulos, setDiscipulos] = useState<any[]>([]);
  const [progreso, setProgreso] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterRed, setFilterRed] = useState('all');
  const [filterLider, setFilterLider] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSemaforo, setFilterSemaforo] = useState('all');

  const fetchData = async () => {
    const [rRes, cRes, lRes, dRes, pRes] = await Promise.all([
      supabase.from('redes').select('*').order('name'),
      supabase.from('casas_de_paz').select('*, redes(name)').order('name'),
      supabase.from('leaders').select('id, full_name, casa_de_paz_id, casas_de_paz(id, name, red_id)').order('full_name'),
      supabase.from('discipulos').select('*').order('full_name'),
      supabase.from('progreso_discipulo').select('*'),
    ]);
    if (rRes.data) setRedes(rRes.data);
    if (cRes.data) setCasas(cRes.data);
    if (lRes.data) setLeaders(lRes.data);
    if (dRes.data) setDiscipulos(dRes.data);
    if (pRes.data) setProgreso(pRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const ch1 = supabase.channel('pub-disc').on('postgres_changes', { event: '*', schema: 'public', table: 'discipulos' }, () => fetchData()).subscribe();
    const ch2 = supabase.channel('pub-prog').on('postgres_changes', { event: '*', schema: 'public', table: 'progreso_discipulo' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  // Filter leaders by red
  const filteredLeaders = useMemo(() => {
    if (filterRed === 'all') return leaders;
    return leaders.filter((l) => {
      const casa = l.casas_de_paz as any;
      return casa?.red_id === filterRed;
    });
  }, [leaders, filterRed]);

  const filtered = useMemo(() => {
    const leaderIds = new Set(filteredLeaders.map((l) => l.id));
    return discipulos.filter((d) => {
      if (!leaderIds.has(d.lider_id) && filterRed !== 'all') return false;
      if (search && !d.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterLider !== 'all' && d.lider_id !== filterLider) return false;
      if (filterStatus !== 'all' && d.status !== filterStatus) return false;
      if (filterSemaforo !== 'all') {
        const discProgreso = progreso.filter((p) => p.discipulo_id === d.id);
        const sem = calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: discProgreso });
        if (sem !== filterSemaforo) return false;
      }
      return true;
    });
  }, [discipulos, filteredLeaders, search, filterLider, filterStatus, filterSemaforo, filterRed]);

  // Group by Red → Casa → Líder
  const hierarchy = useMemo(() => {
    // Build leader → discipulos map
    const leaderDiscMap = new Map<string, any[]>();
    filtered.forEach((d) => {
      const arr = leaderDiscMap.get(d.lider_id) || [];
      arr.push(d);
      leaderDiscMap.set(d.lider_id, arr);
    });

    // Build hierarchy
    const result: any[] = [];
    const usedLeaders = new Set<string>();

    const redesFiltered = filterRed !== 'all' ? redes.filter((r) => r.id === filterRed) : redes;

    redesFiltered.forEach((red) => {
      const redCasas = casas.filter((c) => c.red_id === red.id);
      const redData: any = { ...red, casas: [] };

      redCasas.forEach((casa) => {
        const casaLeaders = leaders.filter((l) => (l.casas_de_paz as any)?.id === casa.id);
        const casaData: any = { ...casa, leaders: [] };

        casaLeaders.forEach((leader) => {
          const discs = leaderDiscMap.get(leader.id) || [];
          if (discs.length > 0 || filterRed !== 'all') {
            casaData.leaders.push({ ...leader, discipulos: discs });
            usedLeaders.add(leader.id);
          }
        });

        if (casaData.leaders.length > 0) {
          redData.casas.push(casaData);
        }
      });

      if (redData.casas.length > 0) {
        result.push(redData);
      }
    });

    // Leaders without casa or red (unassigned)
    const unassignedLeaders = leaders.filter((l) => !usedLeaders.has(l.id));
    const unassignedWithDiscs = unassignedLeaders
      .map((l) => ({ ...l, discipulos: leaderDiscMap.get(l.id) || [] }))
      .filter((l) => l.discipulos.length > 0);

    return { redes: result, unassigned: unassignedWithDiscs };
  }, [redes, casas, leaders, filtered, filterRed]);

  const stats = useMemo(() => {
    const counts: Record<SemaforoColor, number> = { verde: 0, amarillo: 0, rojo: 0, gris: 0, azul: 0 };
    discipulos.forEach((d) => {
      const discProgreso = progreso.filter((p) => p.discipulo_id === d.id);
      const c = calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: discProgreso });
      counts[c]++;
    });
    return counts;
  }, [discipulos]);

  return (
    <PublicLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Seguimiento de discipulado en tiempo real</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(['verde', 'amarillo', 'rojo', 'gris', 'azul'] as SemaforoColor[]).map((c) => (
            <Card key={c} className="border-0 shadow-sm cursor-pointer" onClick={() => setFilterSemaforo(filterSemaforo === c ? 'all' : c)}>
              <CardContent className="p-3 flex items-center gap-2">
                <SemaforoDot color={c} size="md" />
                <div>
                  <div className="text-lg font-bold text-foreground">{stats[c]}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{c === 'verde' ? 'Al día' : c === 'amarillo' ? 'Atención' : c === 'rojo' ? 'Crítico' : c === 'gris' ? 'Pausa' : 'Completo'}</div>
                </div>
              </CardContent>
            </Card>
          ))}
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
          {redes.length > 0 && (
            <Select value={filterRed} onValueChange={setFilterRed}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Red" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las redes</SelectItem>
                {redes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={filterLider} onValueChange={setFilterLider}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Líder" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los líderes</SelectItem>
              {leaders.map((l) => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="En pausa">En pausa</SelectItem>
              <SelectItem value="Completado">Completado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hierarchy: Red → Casa → Líder → Discípulos */}
        <div className="space-y-8">
          {hierarchy.redes.map((red: any) => (
            <div key={red.id} className="space-y-4">
              {/* Red header */}
              <div className="flex items-center gap-2 px-1">
                <Network size={18} className="text-primary" />
                <h2 className="text-lg font-bold text-foreground">{red.name}</h2>
                {red.lider_red && <span className="text-xs text-muted-foreground">• {red.lider_red}</span>}
              </div>

              {red.casas.map((casa: any) => (
                <div key={casa.id} className="space-y-3 ml-2 sm:ml-4">
                  {/* Casa header */}
                  <div className="flex items-center gap-2 px-1">
                    <Home size={15} className="text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">{casa.name}</h3>
                    {casa.city && <span className="text-xs text-muted-foreground">• {casa.city}</span>}
                  </div>

                  {casa.leaders.map((leader: any) => (
                    <Card key={leader.id} className="border-0 shadow-sm ml-2 sm:ml-4">
                      <CardHeader className="pb-3">
                        <Link to={`/lider/${leader.id}`} className="flex items-center gap-2 group">
                          <Users size={16} className="text-primary" />
                          <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors">
                            {leader.full_name}
                          </CardTitle>
                          <span className="text-xs text-muted-foreground">({leader.discipulos.length})</span>
                          <ChevronRight size={14} className="ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                        </Link>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {leader.discipulos.map((d: any) => (
                          <DiscipuloCard key={d.id} discipulo={d} progreso={progreso.filter((p) => p.discipulo_id === d.id)} />
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* Unassigned leaders */}
          {hierarchy.unassigned.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Users size={18} className="text-muted-foreground" />
                <h2 className="text-lg font-bold text-muted-foreground">Sin red asignada</h2>
              </div>
              {hierarchy.unassigned.map((leader: any) => (
                <Card key={leader.id} className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <Link to={`/lider/${leader.id}`} className="flex items-center gap-2 group">
                      <Users size={16} className="text-primary" />
                      <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors">
                        {leader.full_name}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">({leader.discipulos.length})</span>
                      <ChevronRight size={14} className="ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {leader.discipulos.map((d: any) => (
                      <DiscipuloCard key={d.id} discipulo={d} progreso={progreso.filter((p) => p.discipulo_id === d.id)} />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {hierarchy.redes.length === 0 && hierarchy.unassigned.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {discipulos.length === 0
                ? 'No hay datos aún. Ve a /setup para crear líderes y discípulos.'
                : 'No se encontraron resultados con los filtros seleccionados.'}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
