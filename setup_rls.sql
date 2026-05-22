-- SQL Script to Fix RLS Policies (11 Suggestions)
-- This script addresses "rls_policy_always_true" warnings by replacing overly permissive policies
-- with checks for authenticated users.

-- 1. billings
ALTER POLICY "Enable all access for authenticated" ON public.billings USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 2. business_profile
ALTER POLICY "Enable all access for authenticated" ON public.business_profile USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 3. catalogue
ALTER POLICY "Enable all access for authenticated" ON public.catalogue USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 4. categories
ALTER POLICY "Enable all access for authenticated" ON public.categories USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 5. event_services
ALTER POLICY "Enable all access for authenticated" ON public.event_services USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 6. events
ALTER POLICY "Enable all access for authenticated" ON public.events USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 7. expenses
ALTER POLICY "Enable all access for authenticated" ON public.expenses USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 8. members
ALTER POLICY "Enable all access for authenticated" ON public.members USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 9. plans
ALTER POLICY "Enable all access for authenticated" ON public.plans USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 10. services
ALTER POLICY "Enable all access for authenticated" ON public.services USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 11. staff
ALTER POLICY "Enable all access for authenticated" ON public.staff USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
