-- Create table to track terms acceptance
CREATE TABLE public.terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, terms_version)
);

-- Enable RLS
ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptances
CREATE POLICY "Users can view own acceptances"
ON public.terms_acceptance
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own acceptance
CREATE POLICY "Users can insert own acceptance"
ON public.terms_acceptance
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_terms_acceptance_user_version ON public.terms_acceptance(user_id, terms_version);