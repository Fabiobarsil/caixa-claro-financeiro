-- Add billing columns to profiles table for Kiwify monetization
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_source text NOT NULL DEFAULT 'kiwify',
ADD COLUMN IF NOT EXISTS paid_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS first_activity_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 14;

-- Add constraints for valid values
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_plan_type_check CHECK (plan_type IN ('free', 'paid')),
ADD CONSTRAINT profiles_subscription_status_check CHECK (subscription_status IN ('inactive', 'active')),
ADD CONSTRAINT profiles_subscription_source_check CHECK (subscription_source IN ('kiwify', 'stripe'));

-- Create index for webhook lookups by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update RLS policy to allow service role updates for webhooks
-- First, let's ensure service role can update billing fields
CREATE POLICY "Service role can update profiles for webhooks"
ON public.profiles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);