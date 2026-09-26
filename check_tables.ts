import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('Faltan credenciales')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('infantil_acudientes').select('*').limit(1)
  if (error) {
    console.error('ERROR INFANTIL ACUDIENTES:', error.message)
  } else {
    console.log('✅ infantil_acudientes OK')
  }

  const { data: d2, error: e2 } = await supabase.from('infantil_clases').select('*').limit(1)
  if (e2) {
    console.error('ERROR INFANTIL CLASES:', e2.message)
  } else {
    console.log('✅ infantil_clases OK')
  }
}

check()
