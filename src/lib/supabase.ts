import { createClient } from '@supabase/supabase-js';

// Safe fallbacks to prevent runtime crashes when environment variables are not set in build dashboards (e.g. Netlify/Vercel)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vxhicoizewtisxiuolqh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase Engine] WARNING: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in your deployment environment variables! Connecting to Supabase directly will fail.\n' +
    'The client is initialized using a fallback project URL to prevent application boot/mount crashes.'
  );
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

