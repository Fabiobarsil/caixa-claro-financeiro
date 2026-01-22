-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage smart_states" ON public.smart_states;

-- Create more specific policies
-- Insert: only service role (edge function) - no regular user insert
-- This will work because edge function uses service_role key which bypasses RLS

-- Users can only SELECT their own smart_states (already exists)
-- No INSERT/UPDATE/DELETE for regular users - edge function uses service_role