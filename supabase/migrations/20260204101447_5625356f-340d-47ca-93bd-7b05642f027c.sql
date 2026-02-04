-- Add is_system_admin column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_system_admin boolean NOT NULL DEFAULT false;

-- Mark innoveservice01@gmail.com as system_admin
UPDATE public.profiles 
SET is_system_admin = true 
WHERE email = 'innoveservice01@gmail.com';

-- Create function to check if current user is system_admin
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_system_admin FROM public.profiles WHERE user_id = auth.uid()),
    false
  )
$$;

-- Update webhook_events RLS to allow system_admin access
DROP POLICY IF EXISTS "webhook_events_admin_select" ON public.webhook_events;
CREATE POLICY "webhook_events_system_admin_select"
ON public.webhook_events
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_system_admin());

-- Update webhook_requests RLS to allow system_admin access
DROP POLICY IF EXISTS "webhook_requests_admin_select" ON public.webhook_requests;
CREATE POLICY "webhook_requests_system_admin_select"
ON public.webhook_requests
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_system_admin());

-- Add policy for system_admin to view ALL profiles (for admin panel)
DROP POLICY IF EXISTS "profiles_select_all_system_admin" ON public.profiles;
CREATE POLICY "profiles_select_all_system_admin"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_system_admin());

-- Protect is_system_admin from being modified except by service_role
CREATE OR REPLACE FUNCTION public.prevent_system_admin_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only service_role can modify is_system_admin
  IF OLD.is_system_admin IS DISTINCT FROM NEW.is_system_admin THEN
    -- Check if current role is service_role
    IF current_setting('role', true) != 'service_role' THEN
      RAISE EXCEPTION 'Cannot modify is_system_admin - this field can only be changed by system administrators';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS prevent_system_admin_change_trigger ON public.profiles;
CREATE TRIGGER prevent_system_admin_change_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_system_admin_change();