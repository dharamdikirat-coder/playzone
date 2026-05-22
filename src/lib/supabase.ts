import { createClient } from '@supabase/supabase-js';

// User provided credentials
const DEFAULT_URL = 'https://vxhicoizewtisxiuolqh.supabase.co';
const DEFAULT_KEY = 'sb_publishable_kn3fVpMpVX1wGWcUxV-Fpw_w8AomVlA';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.warn('Supabase URL or Anon Key is missing or using placeholder. Check your environment variables.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    realtime: {
      params: {
        events_per_second: 10,
      },
    },
  }
);
