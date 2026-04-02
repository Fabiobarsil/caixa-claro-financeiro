
-- ============================================
-- HARDENING RLS: Add auth.uid() IS NOT NULL guards
-- to all tables missing this critical check
-- ============================================

-- 1. entry_schedules - DROP and recreate with hardened policies
DROP POLICY IF EXISTS "entry_schedules_select_by_account" ON public.entry_schedules;
DROP POLICY IF EXISTS "entry_schedules_insert_by_account" ON public.entry_schedules;
DROP POLICY IF EXISTS "entry_schedules_update_by_account" ON public.entry_schedules;
DROP POLICY IF EXISTS "entry_schedules_delete_by_account" ON public.entry_schedules;

CREATE POLICY "entry_schedules_select_by_account" ON public.entry_schedules
  FOR SELECT USING (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "entry_schedules_insert_by_account" ON public.entry_schedules
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "entry_schedules_update_by_account" ON public.entry_schedules
  FOR UPDATE USING (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id())
  WITH CHECK (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "entry_schedules_delete_by_account" ON public.entry_schedules
  FOR DELETE USING (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id() AND is_admin());

-- 2. expenses - DROP and recreate with hardened policies
DROP POLICY IF EXISTS "expenses_select_by_account" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_by_account" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_by_account" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_by_account" ON public.expenses;

CREATE POLICY "expenses_select_by_account" ON public.expenses
  FOR SELECT USING (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "expenses_insert_by_account" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "expenses_update_by_account" ON public.expenses
  FOR UPDATE USING (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id())
  WITH CHECK (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "expenses_delete_by_account" ON public.expenses
  FOR DELETE USING (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id() AND is_admin());

-- 3. services_products - DROP and recreate with hardened policies
DROP POLICY IF EXISTS "services_products_select_by_account" ON public.services_products;
DROP POLICY IF EXISTS "services_products_insert_by_account" ON public.services_products;
DROP POLICY IF EXISTS "services_products_update_by_account" ON public.services_products;
DROP POLICY IF EXISTS "services_products_delete_by_account" ON public.services_products;

CREATE POLICY "services_products_select_by_account" ON public.services_products
  FOR SELECT USING (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "services_products_insert_by_account" ON public.services_products
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "services_products_update_by_account" ON public.services_products
  FOR UPDATE USING (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id())
  WITH CHECK (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "services_products_delete_by_account" ON public.services_products
  FOR DELETE USING (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id() AND is_admin());

-- 4. smart_states - DROP and recreate with hardened policies
DROP POLICY IF EXISTS "smart_states_select_by_account" ON public.smart_states;
DROP POLICY IF EXISTS "smart_states_insert_by_account" ON public.smart_states;

CREATE POLICY "smart_states_select_by_account" ON public.smart_states
  FOR SELECT USING (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "smart_states_insert_by_account" ON public.smart_states
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id());

-- 5. user_roles - Split broad FOR ALL policy into specific policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "user_roles_admin_select" ON public.user_roles
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_admin());

CREATE POLICY "user_roles_admin_insert" ON public.user_roles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND is_admin() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
      AND p.account_id = current_account_id()
    )
  );

CREATE POLICY "user_roles_admin_update" ON public.user_roles
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND is_admin() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
      AND p.account_id = current_account_id()
    )
  );

CREATE POLICY "user_roles_admin_delete" ON public.user_roles
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND is_admin() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
      AND p.account_id = current_account_id()
    )
  );
