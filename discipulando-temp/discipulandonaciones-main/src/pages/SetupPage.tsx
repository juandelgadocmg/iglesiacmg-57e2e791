import { useState } from 'react';
import { PublicLayout } from '@/components/PublicLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SetupRedesTab } from '@/components/setup/SetupRedesTab';
import { SetupCasasTab } from '@/components/setup/SetupCasasTab';
import { SetupLideresTab } from '@/components/setup/SetupLideresTab';
import { SetupDiscipulosTab } from '@/components/setup/SetupDiscipulosTab';
import LideresPage from '@/pages/LideresPage';

export default function SetupPage() {
  const [setupKey, setSetupKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [discipulos, setDiscipulos] = useState<any[]>([]);
  const [redes, setRedes] = useState<any[]>([]);
  const [casas, setCasas] = useState<any[]>([]);

  const callSetup = async (body: any) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup_data`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ ...body, setup_key: setupKey }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error');
    return json;
  };

  const fetchAll = async () => {
    const [dRes, rRes, cRes] = await Promise.all([
      supabase.from('discipulos').select('id, full_name, lider_id, casa_de_paz_id, status, start_date, last_update_at, leaders(full_name), casas_de_paz(name)').order('full_name'),
      supabase.from('redes').select('*').order('name'),
      supabase.from('casas_de_paz').select('*, redes(name)').order('name'),
    ]);
    if (dRes.data) setDiscipulos(dRes.data);
    if (rRes.data) setRedes(rRes.data);
    if (cRes.data) setCasas(cRes.data);
    try {
      const { leaders: ll } = await callSetup({ action: 'list_leaders' });
      const casasMap = new Map((cRes.data || []).map((c: any) => [c.id, c]));
      setLeaders((ll || []).map((l: any) => ({ ...l, casas_de_paz: l.casa_de_paz_id ? { name: (casasMap.get(l.casa_de_paz_id) as any)?.name } : null })));
    } catch {}
  };

  const unlock = async () => {
    try {
      await callSetup({ action: 'list_leaders' });
      setUnlocked(true);
      fetchAll();
    } catch {
      toast.error('Clave incorrecta');
    }
  };

  if (!unlocked) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto mt-20">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Lock size={18} /> Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Clave de Setup</Label>
                <Input type="password" value={setupKey} onChange={(e) => setSetupKey(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()} placeholder="Ingresa la clave..." />
              </div>
              <Button onClick={unlock} className="w-full">Entrar</Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-bold text-foreground">Panel de Configuración</h1>
        <Tabs defaultValue="redes">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="redes">Redes</TabsTrigger>
            <TabsTrigger value="casas">Casas</TabsTrigger>
            <TabsTrigger value="lideres">Líderes</TabsTrigger>
            <TabsTrigger value="discipulos">Discípulos</TabsTrigger>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
          </TabsList>
          <TabsContent value="redes"><SetupRedesTab redes={redes} callSetup={callSetup} onRefresh={fetchAll} /></TabsContent>
          <TabsContent value="casas"><SetupCasasTab casas={casas} redes={redes} callSetup={callSetup} onRefresh={fetchAll} /></TabsContent>
          <TabsContent value="lideres"><SetupLideresTab leaders={leaders} discipulos={discipulos} casas={casas} callSetup={callSetup} onRefresh={fetchAll} /></TabsContent>
          <TabsContent value="discipulos"><SetupDiscipulosTab discipulos={discipulos} leaders={leaders} casas={casas} callSetup={callSetup} onRefresh={fetchAll} /></TabsContent>
          <TabsContent value="resumen"><LideresPage /></TabsContent>
        </Tabs>
      </div>
    </PublicLayout>
  );
}
