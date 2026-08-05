import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/PublicLayout';
import { DiscipuloCard } from '@/components/DiscipuloCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users } from 'lucide-react';

export default function LeaderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [leader, setLeader] = useState<any>(null);
  const [discipulos, setDiscipulos] = useState<any[]>([]);
  const [progreso, setProgreso] = useState<any[]>([]);

  const fetchData = async () => {
    if (!id) return;
    const [lRes, dRes] = await Promise.all([
      supabase.from('leaders').select('id, full_name, casas_de_paz(name, redes(name))').eq('id', id).maybeSingle(),
      supabase.from('discipulos').select('*').eq('lider_id', id).order('full_name'),
    ]);
    if (lRes.data) setLeader(lRes.data);
    if (dRes.data) {
      setDiscipulos(dRes.data);
      const ids = dRes.data.map((d: any) => d.id);
      if (ids.length > 0) {
        const { data } = await supabase.from('progreso_discipulo').select('*').in('discipulo_id', ids);
        if (data) setProgreso(data);
      }
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  useEffect(() => {
    if (!id) return;
    const ch1 = supabase.channel(`ld-disc-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'discipulos' }, () => fetchData()).subscribe();
    const ch2 = supabase.channel(`ld-prog-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'progreso_discipulo' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [id]);

  if (!leader) return <PublicLayout><div className="text-center py-12 text-muted-foreground">Cargando...</div></PublicLayout>;

  return (
    <PublicLayout>
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={16} /> Volver
        </Link>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
              <Users size={20} className="text-primary" />
              {leader.full_name}
              <span className="text-sm font-normal text-muted-foreground">({discipulos.length} discípulos)</span>
            </CardTitle>
            {((leader as any).casas_de_paz || (leader as any).casas_de_paz?.redes) && (
              <div className="text-xs text-muted-foreground mt-1">
                {(leader as any).casas_de_paz?.redes?.name && <span>Red: {(leader as any).casas_de_paz.redes.name} • </span>}
                {(leader as any).casas_de_paz?.name && <span>Casa: {(leader as any).casas_de_paz.name}</span>}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {discipulos.map((d) => (
              <DiscipuloCard key={d.id} discipulo={d} progreso={progreso.filter((p) => p.discipulo_id === d.id)} />
            ))}
            {discipulos.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin discípulos asignados</p>}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
