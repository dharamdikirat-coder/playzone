import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.error('[Supabase Engine] CRITICAL: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in your deployment environment variables! Connecting to Supabase directly will fail.');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    realtime: {
      params: {
        events_per_second: 10,
      },
    },
  }
);

