-- Fix RLS policies for terms_acceptance to allow first-time users
-- The issue is that current_account_id() may fail if called too early

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "terms_acceptance_select_by_account" ON public.terms_acceptance;
DROP POLICY IF EXISTS "terms_acceptance_insert_by_account" ON public.terms_acceptance;

-- Create new policies that work with user_id (more reliable for first login)
-- SELECT: users can see their own acceptance records
CREATE POLICY "terms_acceptance_select_own"
ON public.terms_acceptance
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: users can create their own acceptance records
-- The account_id can be null initially or match their profile
CREATE POLICY "terms_acceptance_insert_own"
ON public.terms_acceptance
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also ensure profiles can be read by the user themselves during first login
-- This is critical because current_account_id() depends on reading profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow service role to manage terms_acceptance (for edge functions if needed)
CREATE POLICY "terms_acceptance_service_role"
ON public.terms_acceptance
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');