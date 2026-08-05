import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calcularSemaforo, SemaforoColor } from '@/lib/semaforo';
import { SemaforoDot } from '@/components/SemaforoDot';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Network, Home, ChevronRight, UserX, FileDown } from 'lucide-react';
import { generateRedPdf, downloadHtmlAsPdf } from '@/lib/generateRedPdf';

export default function LideresPage() {
  const [redes, setRedes] = useState<any[]>([]);
  const [casas, setCasas] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [discipulos, setDiscipulos] = useState<any[]>([]);
  const [progreso, setProgreso] = useState<any[]>([]);
  const [filterRed, setFilterRed] = useState('all');
  const [filterSemaforo, setFilterSemaforo] = useState<string>('all');

  const fetchData = async () => {
    const [rRes, cRes, lRes, dRes, pRes] = await Promise.all([
      supabase.from('redes').select('*').order('name'),
      supabase.from('casas_de_paz').select('*, redes(name)').order('name'),
      supabase.from('leaders').select('id, full_name, casa_de_paz_id, casas_de_paz(id, name, red_id)').order('full_name'),
      supabase.from('discipulos').select('id, full_name, lider_id, status, last_update_at, start_date'),
      supabase.from('progreso_discipulo').select('discipulo_id, etapa_code, completed'),
    ]);
    if (rRes.data) setRedes(rRes.data);
    if (cRes.data) setCasas(cRes.data);
    if (lRes.data) setLeaders(lRes.data);
    if (dRes.data) setDiscipulos(dRes.data);
    if (pRes.data) setProgreso(pRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const leaderStats = useMemo(() => {
    return leaders.map((leader) => {
      const disc = discipulos.filter((d) => d.lider_id === leader.id);
      const activos = disc.filter((d) => d.status === 'Activo');
      const semaforos = disc.map((d) =>
        calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: [] })
      );
      const verde = semaforos.filter((s) => s === 'verde').length;
      const amarillo = semaforos.filter((s) => s === 'amarillo').length;
      const rojo = semaforos.filter((s) => s === 'rojo').length;
      const gris = semaforos.filter((s) => s === 'gris').length;
      const azul = semaforos.filter((s) => s === 'azul').length;

      // Determine dominant status for filtering
      let dominante: string = 'sin_discipulos';
      if (disc.length > 0) {
        if (rojo > 0) dominante = 'rojo';
        else if (amarillo > 0) dominante = 'amarillo';
        else if (gris > 0 && verde === 0 && azul === 0) dominante = 'gris';
        else if (azul > 0 && verde === 0 && amarillo === 0 && rojo === 0 && gris === 0) dominante = 'azul';
        else dominante = 'verde';
      }

      return {
        ...leader,
        total: disc.length,
        activos: activos.length,
        verde, amarillo, rojo, gris, azul,
        dominante,
      };
    });
  }, [leaders, discipulos]);

  // Group by Red → Casa → Líder
  const hierarchy = useMemo(() => {
    let filteredStats = filterRed === 'all'
      ? leaderStats
      : leaderStats.filter((l) => (l.casas_de_paz as any)?.red_id === filterRed);

    if (filterSemaforo !== 'all') {
      filteredStats = filteredStats.filter((l) => l.dominante === filterSemaforo);
    }

    const usedIds = new Set<string>();
    const result: any[] = [];

    redes.forEach((red) => {
      if (filterRed !== 'all' && red.id !== filterRed) return;
      const redCasas = casas.filter((c) => c.red_id === red.id);
      const redData: any = { ...red, casas: [] };

      redCasas.forEach((casa) => {
        const casaLeaders = filteredStats.filter((l) => (l.casas_de_paz as any)?.id === casa.id);
        if (casaLeaders.length > 0) {
          redData.casas.push({ ...casa, leaders: casaLeaders });
          casaLeaders.forEach((l) => usedIds.add(l.id));
        }
      });

      if (redData.casas.length > 0) result.push(redData);
    });

    const unassigned = filteredStats.filter((l) => !usedIds.has(l.id));
    return { redes: result, unassigned };
  }, [redes, casas, leaderStats, filterRed, filterSemaforo]);

  const LeaderCard = ({ leader }: { leader: any }) => (
    <Link to={`/lider/${leader.id}`}>
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold font-display shrink-0">
              {leader.full_name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-foreground truncate">{leader.full_name}</h3>
              <p className="text-[10px] text-muted-foreground truncate">
                {(leader.casas_de_paz as any)?.name || 'Sin casa'}
              </p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-lg font-bold font-display text-foreground">{leader.activos}</div>
              <div className="text-[10px] text-muted-foreground">Activos</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-lg font-bold font-display text-foreground">{leader.total}</div>
              <div className="text-[10px] text-muted-foreground">Total</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1"><SemaforoDot color="verde" size="sm" />{leader.verde}</span>
            <span className="flex items-center gap-1"><SemaforoDot color="amarillo" size="sm" />{leader.amarillo}</span>
            <span className="flex items-center gap-1"><SemaforoDot color="rojo" size="sm" />{leader.rojo}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display text-foreground">Resumen por Líder</h1>
          <p className="text-muted-foreground text-sm">{leaders.length} líderes registrados</p>
        </div>
        {redes.length > 0 && (
          <Select value={filterRed} onValueChange={setFilterRed}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Filtrar por red" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las redes</SelectItem>
              {redes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Todos', icon: null },
          { key: 'sin_discipulos', label: 'Sin discípulos', icon: <UserX size={14} /> },
          { key: 'verde', label: 'Al día', icon: <SemaforoDot color="verde" size="sm" /> },
          { key: 'amarillo', label: 'Atención', icon: <SemaforoDot color="amarillo" size="sm" /> },
          { key: 'rojo', label: 'Crítico', icon: <SemaforoDot color="rojo" size="sm" /> },
          { key: 'gris', label: 'En pausa', icon: <SemaforoDot color="gris" size="sm" /> },
          { key: 'azul', label: 'Completado', icon: <SemaforoDot color="azul" size="sm" /> },
        ].map((f) => {
          const count = f.key === 'all' ? leaderStats.length : leaderStats.filter((l) => l.dominante === f.key).length;
          return (
            <Button
              key={f.key}
              size="sm"
              variant={filterSemaforo === f.key ? 'default' : 'outline'}
              onClick={() => setFilterSemaforo(f.key)}
              className="gap-1.5 text-xs"
            >
              {f.icon}
              {f.label} ({count})
            </Button>
          );
        })}
      </div>

      <div className="space-y-8">
        {hierarchy.redes.map((red: any) => (
          <div key={red.id} className="space-y-4">
            <div className="flex items-center gap-2">
              <Network size={18} className="text-primary" />
              <h2 className="text-lg font-bold text-foreground">{red.name}</h2>
              {red.lider_red && <span className="text-xs text-muted-foreground">• {red.lider_red}</span>}
              <Button
                size="sm"
                variant="outline"
                className="ml-auto gap-1.5 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  const html = generateRedPdf(red, leaders, discipulos, progreso, casas);
                  if (html) downloadHtmlAsPdf(html, `Informe_${red.name}.pdf`);
                }}
              >
                <FileDown size={14} /> PDF
              </Button>
            </div>

            {red.casas.map((casa: any) => (
              <div key={casa.id} className="space-y-3 ml-2 sm:ml-4">
                <div className="flex items-center gap-2">
                  <Home size={15} className="text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{casa.name}</h3>
                  {casa.city && <span className="text-xs text-muted-foreground">• {casa.city}</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-2 sm:ml-4">
                  {casa.leaders.map((leader: any) => (
                    <LeaderCard key={leader.id} leader={leader} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        {hierarchy.unassigned.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-muted-foreground">Sin red asignada</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hierarchy.unassigned.map((leader: any) => (
                <LeaderCard key={leader.id} leader={leader} />
              ))}
            </div>
          </div>
        )}
      </div>

      {leaders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No hay líderes registrados</div>
      )}
    </div>
  );
}
