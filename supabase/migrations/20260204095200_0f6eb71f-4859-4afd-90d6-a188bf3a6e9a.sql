-- Fix webhook_events RLS - add explicit auth check
DROP POLICY IF EXISTS "webhook_events_admin_select" ON public.webhook_events;

CREATE POLICY "webhook_events_admin_select"
ON public.webhook_events
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_admin());

-- Fix webhook_requests RLS - add explicit auth check  
DROP POLICY IF EXISTS "webhook_requests_admin_select" ON public.webhook_requests;

CREATE POLICY "webhook_requests_admin_select"
ON public.webhook_requests
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_admin());

-- Harden profiles RLS - ensure explicit auth checks on all SELECT policies
DROP POLICY IF EXISTS "profiles_select_by_account_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "profiles_select_by_account_admin"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND current_account_id() IS NOT NULL AND account_id = current_account_id() AND is_admin());