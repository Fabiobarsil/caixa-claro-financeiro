-- Create subscription_status enum type
CREATE TYPE public.subscription_status AS ENUM ('ativo', 'pendente', 'em_atraso', 'cancelado', 'expirado');

-- Create plan enum type  
CREATE TYPE public.subscription_plan AS ENUM ('mensal', 'semestral', 'anual');

-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_start_date timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_expiration_date timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone DEFAULT NULL;

-- Create webhook_requests table for logging all requests (including failures)
CREATE TABLE public.webhook_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status_code integer NOT NULL,
  reason text,
  headers jsonb,
  raw_body text,
  source text DEFAULT 'kiwify'
);

-- Enable RLS on webhook_requests
ALTER TABLE public.webhook_requests ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can access webhook_requests
CREATE POLICY "webhook_requests_admin_select" ON public.webhook_requests
FOR SELECT USING (is_admin());

CREATE POLICY "webhook_requests_service_role" ON public.webhook_requests
FOR ALL USING (auth.role() = 'service_role');

-- Create webhook_events table for processed events
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text NOT NULL,
  raw_event text NOT NULL,
  normalized_event text NOT NULL,
  raw_product text,
  normalized_plan text,
  subscription_status_applied text NOT NULL,
  expiration_date_applied timestamp with time zone,
  profile_id uuid REFERENCES public.profiles(id),
  success boolean DEFAULT true,
  error_message text
);

-- Enable RLS on webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can access webhook_events
CREATE POLICY "webhook_events_admin_select" ON public.webhook_events
FOR SELECT USING (is_admin());

CREATE POLICY "webhook_events_service_role" ON public.webhook_events
FOR ALL USING (auth.role() = 'service_role');