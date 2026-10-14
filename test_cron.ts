import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as dotenv from 'https://deno.land/std@0.224.0/dotenv/mod.ts';
const env = await dotenv.load({ envPath: '.env' });
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('cdp_generate_deadline_alerts');
  console.log("Result:", data);
  console.log("Error:", error);
}
run();
