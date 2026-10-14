const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const email = 'susana260474@outlook.es';
  console.log(`Buscando usuario con email: ${email}`);
  
  // Buscar en auth.users no podemos directamente con anon key si no hay policy, pero podemos buscar en leaders
  let { data: leader } = await supabase.from('leaders').select('*').eq('email', email).maybeSingle();
  
  if (!leader) {
    console.log("No se encontro un lider con ese email. Buscando en personas...");
    // Intentemos obtener el ID de alguna otra forma o simplemente no podemos.
    // Asumiré que el lider existe porque el usuario dijo que el dashboard cargó y la captura lo muestra.
    // Busquemos por email
    console.log("Error: El usuario no tiene registro en la tabla leaders y no puedo crearlo sin el auth.user.id");
    return;
  }
  
  const liderId = leader.id;
  console.log(`Lider encontrado con ID: ${liderId}`);

  // Insertar discípulos de prueba
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

  // Para Juan Perez, marquemos NPT como completado y una visita orando (Casa Ungida)
  const juanId = dData[0].id;
  
  const { error: pErr } = await supabase.from('etapas_discipulado_progreso').insert([
    { discipulo_id: juanId, etapa_code: 'NPT', completed: true, completed_at: new Date().toISOString() }
  ]);
  
  if (pErr) console.error("Error progreso:", pErr);
  
  const { error: vErr } = await supabase.from('visitas_discipulado').insert([
    { discipulo_id: juanId, lider_id: liderId, date: new Date().toISOString().split('T')[0], oro: true, enseno: true, notes: 'Visita de prueba' }
  ]);
  
  if (vErr) console.error("Error visita:", vErr);

  console.log("Datos de prueba creados exitosamente para Juan Perez.");
}

run();
