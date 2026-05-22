-- Supabase Combined Schema (Updated for FunkyLand)
-- Includes Business Profile, Staff, Categories, Plans, Members, Services, Catalogue, Billings, Events, Expenses, and Socks Types

-- 1. Business Profile
CREATE TABLE IF NOT EXISTS business_profile (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'FunkyLand',
  sub_name TEXT DEFAULT '',
  unit_name TEXT DEFAULT '',
  address TEXT DEFAULT '',
  gst_no TEXT DEFAULT '',
  mobile TEXT DEFAULT '',
  email TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  accounting_year_start TEXT DEFAULT '01-04',
  grace_period_minutes INTEGER DEFAULT 10,
  overtime_rate_per_minute NUMERIC DEFAULT 2,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Staff
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'Cashier',
  phone TEXT,
  status TEXT DEFAULT 'active',
  joined_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL
);

-- 4. Plans
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  price NUMERIC NOT NULL,
  type TEXT DEFAULT 'Hourly',
  validation_days INTEGER DEFAULT 0,
  validation_time_min INTEGER DEFAULT 60,
  description TEXT,
  gst_slab INTEGER DEFAULT 18,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Members
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  parent_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  child_name TEXT,
  child_age INTEGER,
  plan_id TEXT REFERENCES plans(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Services
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  gst_slab INTEGER DEFAULT 18
);

-- 7. Catalogue
CREATE TABLE IF NOT EXISTS catalogue (
  id SERIAL PRIMARY KEY,
  design_name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  image_url TEXT,
  estimate_price NUMERIC DEFAULT 0,
  description TEXT
);

-- 8. Socks Types (Dynamic Inventory)
CREATE TABLE IF NOT EXISTS socks_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  gst_slab INTEGER DEFAULT 5
);

-- 9. Billings (Entries)
CREATE TABLE IF NOT EXISTS billings (
  id SERIAL PRIMARY KEY,
  customer_id TEXT REFERENCES members(id),
  customer_name TEXT,
  handled_by TEXT REFERENCES staff(id),
  mobile_no TEXT,
  plan_id TEXT REFERENCES plans(id),
  duration_min INTEGER,
  person_count INTEGER DEFAULT 1,
  socks_counts JSONB DEFAULT '{}',
  items JSONB DEFAULT '[]',
  subtotal NUMERIC NOT NULL,
  total_gst NUMERIC NOT NULL,
  payable NUMERIC NOT NULL,
  payment_mode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Events
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  customer_id TEXT REFERENCES members(id),
  customer_name TEXT,
  phone_number TEXT,
  booking_charges NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  gst_percent INTEGER DEFAULT 18,
  advance_amount NUMERIC DEFAULT 0,
  payment_mode TEXT,
  payment_status TEXT DEFAULT 'Pending',
  booking_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Play Entries
CREATE TABLE IF NOT EXISTS play_entries (
  id TEXT PRIMARY KEY,
  child_name TEXT NOT NULL,
  parent_name TEXT,
  mobile_number TEXT,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  plan_id TEXT REFERENCES plans(id),
  plan_name TEXT,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  member_id TEXT REFERENCES members(id),
  person_count INTEGER DEFAULT 1,
  socks_counts JSONB DEFAULT '{}',
  invoice_id TEXT,
  overtime_amount NUMERIC DEFAULT 0,
  staff_id TEXT REFERENCES staff(id),
  handled_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Event Services (Mapping)
CREATE TABLE IF NOT EXISTS event_services (
  event_id TEXT NOT NULL REFERENCES events(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  PRIMARY KEY(event_id, service_id)
);

-- 15. Walk-in Customers (V1 Legacy)
CREATE TABLE IF NOT EXISTS walk_in_customers (
  id SERIAL PRIMARY KEY,
  billno TEXT,
  cid TEXT,
  mode TEXT,
  grandtotal NUMERIC,
  subtotal NUMERIC,
  paybleamount NUMERIC,
  discount NUMERIC,
  planamount NUMERIC,
  shokesprice NUMERIC,
  extraamount NUMERIC,
  noofperson INTEGER,
  insdate TIMESTAMP WITH TIME ZONE
);

-- 16. Walk-in Members (V2 Legacy)
CREATE TABLE IF NOT EXISTS walk_in_members (
  id SERIAL PRIMARY KEY,
  memberid TEXT,
  name TEXT,
  mno TEXT,
  status TEXT,
  shokesprice NUMERIC,
  validationdate TEXT
);

-- Initial Staff (Admin)
INSERT INTO staff (id, password, full_name, role, status)
VALUES ('admin', '12345', 'Administrator', 'admin', 'active')
ON CONFLICT (id) DO NOTHING;

-- Initial Socks types
INSERT INTO socks_types (name, price, gst_slab)
VALUES ('Small Socks', 40, 5), ('Medium Socks', 50, 5)
ON CONFLICT DO NOTHING;

-- RLS Fixes
DO $$
DECLARE
    t text;
    tables_to_fix text[] := ARRAY[
        'billings', 'business_profile', 'catalogue', 'categories', 
        'events', 'expenses', 'members', 'plans', 'services', 
        'staff', 'socks_types', 'play_entries', 'system_settings',
        'event_services', 'walk_in_customers', 'walk_in_members'
    ];
BEGIN
    FOR t IN SELECT unnest(tables_to_fix) LOOP
        -- Check if table exists before trying to fix RLS
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated select" ON public.%I;', t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert" ON public.%I;', t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update" ON public.%I;', t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated delete" ON public.%I;', t);
            
            EXECUTE format('CREATE POLICY "Allow authenticated select" ON public.%I FOR SELECT TO authenticated USING (true);', t);
            EXECUTE format('CREATE POLICY "Allow authenticated insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.role() = ''authenticated'');', t);
            EXECUTE format('CREATE POLICY "Allow authenticated update" ON public.%I FOR UPDATE TO authenticated USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'');', t);
            EXECUTE format('CREATE POLICY "Allow authenticated delete" ON public.%I FOR DELETE TO authenticated USING (auth.role() = ''authenticated'');', t);
        END IF;
    END LOOP;
END $$;

-- Fix for Supabase Security Lint Warnings (rls_auto_enable)
-- This ensures the security definer function cannot be called by public/anon roles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC';
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon';
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated';
        EXECUTE 'ALTER FUNCTION public.rls_auto_enable() SECURITY INVOKER';
    END IF;
END $$;
-- Re-initialize policies to allow both authenticated roles and public clients to sync
ALTER TABLE public.billings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans DISABLE ROW LEVEL SECURITY;
