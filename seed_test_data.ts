import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const email = 'susana260474@outlook.es';
  console.log(`Buscando usuario con email: ${email}`);
  
  let { data: leader } = await supabase.from('leaders').select('*').eq('email', email).maybeSingle();
  
  if (!leader) {
    console.log("No se encontro un lider con ese email. Tratando de buscar por algo aproximado...");
    const { data: allLeaders } = await supabase.from('leaders').select('*').ilike('email', '%susana%');
    if (allLeaders && allLeaders.length > 0) {
      leader = allLeaders[0];
      console.log(`Encontrado: ${leader.email}`);
    } else {
      console.log("Definitivamente no encontrado.");
      return;
    }
  }
  
  const liderId = leader.id;
  console.log(`Lider encontrado con ID: ${liderId}`);

  const discipulos = [
    { full_name: 'Juan Perez (Prueba)', lider_id: liderId, status: 'Activo' },
    { full_name: 'Maria Gomez (Prueba)', lider_id: liderId, status: 'Activo' },
    { full_name: 'Carlos Ruiz (Prueba)', lider_id: liderId, status: 'Activo' },
  ];

  const { data: dData, error: dErr } = await supabase.from('discipulos').insert(discipulos).select();
  if (dErr) {
    console.error("Error insertando discipulos:", dErr);
    return;
  }
  
  console.log(`Insertados ${dData.length} discipulos de prueba.`);

  const juanId = dData[0].id;
  
  const { error: pErr } = await supabase.from('etapas_discipulado_progreso').insert([
    { discipulo_id: juanId, etapa_code: 'NPT', completed: true, completed_at: new Date().toISOString() }
  ]);
  
  if (pErr) console.error("Error progreso:", pErr);
  
  const { error: vErr } = await supabase.from('visitas_discipulado').insert([
    { discipulo_id: juanId, lider_id: liderId, date: new Date().toISOString().split('T')[0], oro: true, enseno: true, notes: 'Visita de prueba' }
  ]);
  
  if (vErr) console.error("Error visita:", vErr);

  console.log("Datos de prueba creados exitosamente.");
}

run();
