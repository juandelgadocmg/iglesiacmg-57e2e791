const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bxqichxpvnlofqsjdcdg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cWljaHhwdm5sb2Zxc2pkY2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTk2MTAsImV4cCI6MjA4ODM5NTYxMH0.KfEN9kYdW9BDICNYSTdkBB0WaFnXE45HfSDZL8oL_vU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: v } = await supabase.from('discipulo_visitas').select('*').limit(5);
  const { data: a } = await supabase.from('discipulo_actividades').select('*').limit(5);
  const { data: d } = await supabase.from('discipulos').select('*').limit(500);
  const { data: l } = await supabase.from('leaders').select('*').limit(500);
  const { data: c } = await supabase.from('grupos').select('*').limit(500);
  
  // Simulate logic
  const casasRaw = c.map(g => ({ id: g.id, name: g.nombre, red_id: g.red }));
  const uniqueRedes = Array.from(new Set(c.map(g => g.red).filter(Boolean)));
  const redesRaw = uniqueRedes.map(r => ({ id: r, name: `Red ${r}` }));
  
  const redByCasa = {};
  casasRaw.forEach(casa => {
      const r = redesRaw.find(red => red.id === casa.red_id);
      redByCasa[casa.id] = r ? r.name : 'Sin Red';
  });
  
  const interactions = [...v.map(vi => ({...vi, tipo: 'Visita'})), ...a.map(ll => ({...ll, tipo: 'Llamada'}))];
  
  interactions.forEach(i => {
      const disc = d.find(dis => dis.id === i.discipulo_id);
      let cId = disc?.casa_de_paz_id;
      if (!cId) {
          const lid = l.find(leader => leader.id === (i.lider_id || disc?.lider_id));
          cId = lid?.casa_de_paz_id;
      }
      const redName = cId ? (redByCasa[cId] || 'Sin Red') : 'Sin Red';
      console.log(`Interaction: ${i.tipo}, Discipulo: ${disc?.full_name}, cId: ${cId}, Red: ${redName}`);
  });
}
run();
