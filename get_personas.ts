import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from('personas').select('*').limit(5);
  console.log('Error:', error);
  console.log('Data count:', data?.length);
  console.log('Sample:', data);
}
run();
