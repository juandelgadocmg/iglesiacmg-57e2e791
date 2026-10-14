const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wzngqewkftjohjmxrtly.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '...'; // I will get the keys from .env
