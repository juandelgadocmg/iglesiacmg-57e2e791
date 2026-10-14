import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/PublicLayout';
import { ETAPAS_ORDER, ETAPAS_LABELS } from '@/lib/semaforo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Save, Loader2, MessageSquarePlus, ChevronDown, ChevronUp, CheckCircle2, Circle, User } from 'lucide-react';

export default function UpdateLeaderPage() {
  const { token } = useParams<{ token: string }>();
  const [leader, setLeader] = useState<any>(null);
  const [discipulos, setDiscipulos] = useState<any[]>([]);
  const [progreso, setProgreso] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [localProgress, setLocalProgress] = useState<Record<string, string[]>>({});
  const [seguimientos, setSeguimientos] = useState<Record<string, string>>({});
  const [showSeg, setShowSeg] = useState<Record<string, boolean>>({});
  const [expandedDisc, setExpandedDisc] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const lookupUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update_by_leader_token`;
      const lookupRes = await fetch(lookupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: 'lookup', leader_token: token }),
      });
      const lookupJson = await lookupRes.json();
      const ldr = lookupRes.ok ? lookupJson.leader : null;
      if (!ldr) { setError('Token inválido'); setLoading(false); return; }
      setLeader(ldr);

      const { data: discs } = await supabase.from('discipulos').select('*').eq('lider_id', ldr.id).order('full_name');
      setDiscipulos(discs || []);

      if (discs && discs.length > 0) {
        const ids = discs.map((d: any) => d.id);
        const { data: prog } = await supabase.from('progreso_discipulo').select('*').in('discipulo_id', ids);
        setProgreso(prog || []);

        const lp: Record<string, string[]> = {};
        for (const d of discs) {
          lp[d.id] = (prog || []).filter((p: any) => p.discipulo_id === d.id && p.completed).map((p: any) => p.etapa_code);
        }
        setLocalProgress(lp);
        // Auto-expand first disciple
        if (discs.length > 0) setExpandedDisc(discs[0].id);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  const toggleEtapa = (discId: string, code: string) => {
    setSaved((prev) => ({ ...prev, [discId]: false }));
    setLocalProgress((prev) => {
      const current = prev[discId] || [];
      return {
        ...prev,
        [discId]: current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
      };
    });
  };

  const guardar = async (discId: string) => {
    if (!token) return;
    setSaving((prev) => ({ ...prev, [discId]: true }));
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update_by_leader_token`;
      const body: any = {
        leader_token: token,
        discipulo_id: discId,
        etapas_completadas: localProgress[discId] || [],
      };
      if (seguimientos[discId]?.trim()) {
        body.seguimiento = { resumen: seguimientos[discId].trim() };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      toast.success('¡Progreso guardado!');
      setSaved((prev) => ({ ...prev, [discId]: true }));
      setSeguimientos((prev) => ({ ...prev, [discId]: '' }));
      setShowSeg((prev) => ({ ...prev, [discId]: false }));
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    }
    setSaving((prev) => ({ ...prev, [discId]: false }));
  };

  if (loading) return <PublicLayout><div className="text-center py-12 text-muted-foreground">Cargando...</div></PublicLayout>;
  if (error) return <PublicLayout><div className="text-center py-12 text-destructive font-medium">{error}</div></PublicLayout>;

  return (
    <PublicLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Actualizar Progreso</h1>
          <p className="text-sm text-muted-foreground">Líder: {leader?.full_name}</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {discipulos.map((d) => {
            const completed = (localProgress[d.id] || []).length;
            const pct = Math.round((completed / ETAPAS_ORDER.length) * 100);
            const isExpanded = expandedDisc === d.id;
            return (
              <button
                key={`summary-${d.id}`}
                onClick={() => setExpandedDisc(isExpanded ? null : d.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isExpanded ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User size={14} className="text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{d.full_name}</span>
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="text-[10px] text-muted-foreground mt-1">{completed}/{ETAPAS_ORDER.length} etapas • {pct}%</div>
              </button>
            );
          })}
        </div>

        {/* Expanded disciple detail */}
        {expandedDisc && discipulos.map((d) => {
          if (d.id !== expandedDisc) return null;
          const completed = localProgress[d.id] || [];
          const pct = Math.round((completed.length / ETAPAS_ORDER.length) * 100);
          return (
            <Card key={d.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User size={18} className="text-primary" />
                    {d.full_name}
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">{pct}%</span>
                </CardTitle>
                <Progress value={pct} className="h-2 mt-1" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {ETAPAS_ORDER.map((code) => {
                    const done = completed.includes(code);
                    return (
                      <button
                        key={code}
                        onClick={() => toggleEtapa(d.id, code)}
                        className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all ${
                          done
                            ? 'bg-primary/5 border-primary/30'
                            : 'bg-card border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 size={20} className="text-primary shrink-0" />
                        ) : (
                          <Circle size={20} className="text-muted-foreground/40 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className={`font-medium text-sm ${done ? 'text-primary' : 'text-foreground'}`}>{code}</div>
                          <div className="text-xs text-muted-foreground leading-tight">{ETAPAS_LABELS[code]}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setShowSeg((p) => ({ ...p, [d.id]: !p[d.id] }))}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <MessageSquarePlus size={14} />
                  Agregar seguimiento
                  {showSeg[d.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showSeg[d.id] && (
                  <Textarea
                    placeholder="Resumen del seguimiento..."
                    value={seguimientos[d.id] || ''}
                    onChange={(e) => setSeguimientos((p) => ({ ...p, [d.id]: e.target.value }))}
                    className="text-sm"
                    rows={3}
                  />
                )}

                <Button
                  className="w-full"
                  onClick={() => guardar(d.id)}
                  disabled={saving[d.id]}
                  variant={saved[d.id] ? 'outline' : 'default'}
                >
                  {saving[d.id] ? (
                    <><Loader2 size={16} className="animate-spin mr-1" /> Guardando...</>
                  ) : saved[d.id] ? (
                    <><CheckCircle2 size={16} className="mr-1 text-primary" /> Guardado</>
                  ) : (
                    <><Save size={16} className="mr-1" /> Guardar Progreso</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {discipulos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No tienes discípulos asignados</div>
        )}
      </div>
    </PublicLayout>
  );
}
