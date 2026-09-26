const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bxqichxpvnlofqsjdcdg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cWljaHhwdm5sb2Zxc2pkY2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTk2MTAsImV4cCI6MjA4ODM5NTYxMH0.KfEN9kYdW9BDICNYSTdkBB0WaFnXE45HfSDZL8oL_vU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: v } = await supabase.from('discipulo_visitas').select('*').limit(1);
  const { data: a } = await supabase.from('discipulo_actividades').select('*').limit(1);
  console.log("Visitas Schema:", v && v.length > 0 ? Object.keys(v[0]) : "No data");
  console.log("Actividades Schema:", a && a.length > 0 ? Object.keys(a[0]) : "No data");
}
run();
