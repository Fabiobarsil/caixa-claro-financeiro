-- Remove the public policy that exposes admin user_ids
DROP POLICY IF EXISTS "Anyone can check if admin exists" ON public.user_roles;