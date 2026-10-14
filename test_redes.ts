import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: d } = await supabase.from('discipulos').select('id, full_name, casa_de_paz_id, lider_id').limit(5);
  console.log("Discipulos:", d);
  const { data: l } = await supabase.from('leaders').select('id, full_name, casa_de_paz_id').limit(5);
  console.log("Leaders:", l);
  const { data: g } = await supabase.from('grupos').select('id, nombre, lider_id, red').limit(5);
  console.log("Grupos:", g);
}
run();
