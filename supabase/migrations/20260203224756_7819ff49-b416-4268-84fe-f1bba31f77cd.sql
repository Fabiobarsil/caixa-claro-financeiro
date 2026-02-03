-- Allow public read-only access to check if any admin exists
-- This is needed for the first-access flow to determine if setup is complete
CREATE POLICY "Anyone can check if admin exists"
ON public.user_roles
FOR SELECT
USING (role = 'admin'::app_role);