const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bxqichxpvnlofqsjdcdg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cWljaHhwdm5sb2Zxc2pkY2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTk2MTAsImV4cCI6MjA4ODM5NTYxMH0.KfEN9kYdW9BDICNYSTdkBB0WaFnXE45HfSDZL8oL_vU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('discipulos').select('id, full_name, casa_de_paz_id, lider_id').limit(10);
  console.log("Discipulos:", data);
  const { data: leads } = await supabase.from('leaders').select('id, full_name, casa_de_paz_id').limit(10);
  console.log("Leaders:", leads);
}
run();
