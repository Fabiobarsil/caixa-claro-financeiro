-- Create smart_states table for daily intelligence messages
CREATE TABLE public.smart_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('alert', 'insight')),
  severity TEXT NOT NULL CHECK (severity IN ('attention', 'info')),
  message TEXT NOT NULL,
  generated_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Only one smart_state per user per day
  CONSTRAINT unique_user_day UNIQUE (user_id, generated_at)
);

-- Enable RLS
ALTER TABLE public.smart_states ENABLE ROW LEVEL SECURITY;

-- Users can view their own smart states
CREATE POLICY "Users can view own smart_states"
ON public.smart_states
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert/update (for edge function)
CREATE POLICY "Service role can manage smart_states"
ON public.smart_states
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for fast lookup by user and date
CREATE INDEX idx_smart_states_user_date ON public.smart_states (user_id, generated_at DESC);