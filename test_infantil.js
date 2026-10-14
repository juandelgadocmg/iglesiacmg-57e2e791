const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bxqichxpvnlofqsjdcdg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cWljaHhwdm5sb2Zxc2pkY2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTk2MTAsImV4cCI6MjA4ODM5NTYxMH0.KfEN9kYdW9BDICNYSTdkBB0WaFnXE45HfSDZL8oL_vU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking infantil_acudientes...");
  const { error: e1 } = await supabase.from('infantil_acudientes').select('*').limit(1);
  if (e1) console.error("Error 1:", e1.message);
  else console.log("OK 1");

  console.log("Checking infantil_clases...");
  const { error: e2 } = await supabase.from('infantil_clases').select('*').limit(1);
  if (e2) console.error("Error 2:", e2.message);
  else console.log("OK 2");
}
run();
