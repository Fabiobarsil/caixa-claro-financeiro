-- Fix RLS policies to explicitly require authentication
-- This prevents any anonymous access to sensitive tables

-- Drop and recreate subscriptions policies with explicit auth check
DROP POLICY IF EXISTS "subscriptions_select_by_account" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_by_account" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_by_account" ON public.subscriptions;

CREATE POLICY "subscriptions_select_by_account" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "subscriptions_insert_by_account" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "subscriptions_update_by_account" 
ON public.subscriptions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id())
WITH CHECK (auth.uid() IS NOT NULL AND account_id = current_account_id());

-- Drop and recreate entries policies with explicit auth check
DROP POLICY IF EXISTS "entries_select_by_account" ON public.entries;
DROP POLICY IF EXISTS "entries_insert_by_account" ON public.entries;
DROP POLICY IF EXISTS "entries_update_by_account" ON public.entries;
DROP POLICY IF EXISTS "entries_delete_by_account" ON public.entries;

CREATE POLICY "entries_select_by_account" 
ON public.entries 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "entries_insert_by_account" 
ON public.entries 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "entries_update_by_account" 
ON public.entries 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id())
WITH CHECK (auth.uid() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "entries_delete_by_account" 
ON public.entries 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id() AND is_admin());

COMMENT ON POLICY "subscriptions_select_by_account" ON public.subscriptions IS 'Only authenticated users can view subscriptions from their own account';
COMMENT ON POLICY "entries_select_by_account" ON public.entries IS 'Only authenticated users can view entries from their own account';