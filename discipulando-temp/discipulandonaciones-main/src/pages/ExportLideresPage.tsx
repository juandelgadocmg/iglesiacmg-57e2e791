import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Copy, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface LeaderRow {
  red: string;
  lider_red: string;
  casa: string;
  lider: string;
  token: string | null;
  link: string;
}

export default function ExportLideresPage() {
  const [setupKey, setSetupKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState<Map<string, Map<string, LeaderRow[]>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const unlockAndFetch = async () => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup_data`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action: 'list_leaders', setup_key: setupKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      const leaders = json.leaders || [];

      const [casasRes, redesRes] = await Promise.all([
        supabase.from('casas_de_paz').select('id, name, red_id').order('name'),
        supabase.from('redes').select('id, name, lider_red'),
      ]);
      const casasMap = new Map((casasRes.data || []).map((c: any) => [c.id, c]));
      const redesMap = new Map((redesRes.data || []).map((r: any) => [r.id, r]));

      const grouped = new Map<string, Map<string, LeaderRow[]>>();
      leaders.forEach((l: any) => {
        const casa: any = l.casa_de_paz_id ? casasMap.get(l.casa_de_paz_id) : null;
        const redObj: any = casa?.red_id ? redesMap.get(casa.red_id) : null;
        const red = redObj?.name || 'Sin Red';
        const liderRed = redObj?.lider_red || '';
        const casaName = casa?.name || 'Sin Casa';
        const token = l.update_token;
        const link = token
          ? `${window.location.origin}/actualizar-lider/${token}`
          : 'SIN TOKEN';
        if (!grouped.has(red)) grouped.set(red, new Map());
        const redMap = grouped.get(red)!;
        if (!redMap.has(casaName)) redMap.set(casaName, []);
        redMap.get(casaName)!.push({ red, lider_red: liderRed, casa: casaName, lider: l.full_name, token, link });
      });
      setData(grouped);
      setUnlocked(true);
    } catch (err: any) {
      toast.error(err.message || 'Clave incorrecta');
    }
    setLoading(false);
  };

  const generateText = () => {
    let text = '═══════════════════════════════════════════\n';
    text += '  LISTADO DE LÍDERES CON LINKS DE ACTUALIZACIÓN\n';
    text += '  Generado: ' + new Date().toLocaleDateString('es-CO') + '\n';
    text += '═══════════════════════════════════════════\n\n';
    data.forEach((casas, red) => {
      const firstLeader = casas.values().next().value?.[0];
      text += `\n🔷 RED: ${red}\n`;
      if (firstLeader?.lider_red) text += `   Líder de Red: ${firstLeader.lider_red}\n`;
      text += '───────────────────────────────────────────\n';
      casas.forEach((leaders, casa) => {
        text += `\n  🏠 Casa de Paz: ${casa}\n`;
        leaders.forEach((l) => {
          text += `     👤 ${l.lider}\n`;
          text += `        ${l.link}\n`;
        });
      });
      text += '\n';
    });
    return text;
  };

  const downloadFile = () => {
    const text = generateText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lideres-links-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo descargado');
  };

  const copyAll = () => {
    navigator.clipboard.writeText(generateText());
    setCopied(true);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!unlocked) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto mt-20">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Lock size={18} /> Exportar Links de Líderes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Esta sección contiene tokens privados. Ingresa la clave de setup.</p>
              <div>
                <Label>Clave de Setup</Label>
                <Input type="password" value={setupKey} onChange={(e) => setSetupKey(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlockAndFetch()} placeholder="Ingresa la clave..." />
              </div>
              <Button onClick={unlockAndFetch} className="w-full" disabled={loading}>{loading ? 'Cargando...' : 'Entrar'}</Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Listado de Líderes por Red</h1>
          <div className="flex gap-2">
            <Button onClick={copyAll} variant="outline" size="sm">
              {copied ? <Check size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
              {copied ? 'Copiado' : 'Copiar todo'}
            </Button>
            <Button onClick={downloadFile} size="sm">
              <Download size={16} className="mr-1" /> Descargar .txt
            </Button>
          </div>
        </div>

        {Array.from(data.entries()).map(([red, casas]) => {
          const firstLeader = casas.values().next().value?.[0];
          return (
            <Card key={red} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-primary">🔷 Red: {red}</CardTitle>
                {firstLeader?.lider_red && (
                  <p className="text-sm text-muted-foreground">Líder de Red: {firstLeader.lider_red}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from(casas.entries()).map(([casa, leaders]) => (
                  <div key={casa} className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">🏠 {casa}</h3>
                    <div className="space-y-1 ml-4">
                      {leaders.map((l) => (
                        <div key={l.lider} className="flex flex-col sm:flex-row sm:items-center gap-1 text-sm py-1 border-b border-border/50 last:border-0">
                          <span className="font-medium min-w-[180px]">👤 {l.lider}</span>
                          <span className="text-xs text-muted-foreground break-all flex-1">{l.link}</span>
                          {l.token && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="shrink-0 h-6 w-6"
                              onClick={() => {
                                navigator.clipboard.writeText(l.link);
                                toast.success(`Link de ${l.lider} copiado`);
                              }}
                            >
                              <Copy size={12} />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PublicLayout>
  );
}
