-- Fix the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.subscriptions;

-- Create a more restrictive update policy using service role check
-- Only edge functions with service role can update subscriptions
CREATE POLICY "Authenticated users can update own subscription"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);