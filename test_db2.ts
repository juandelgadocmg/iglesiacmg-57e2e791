import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const url = Deno.env.get('VITE_SUPABASE_URL');
const key = Deno.env.get('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(url, key);

async function run() {
  const { data } = await supabase.from('leaders').select('*').limit(5);
  console.log(data);
}
run();
