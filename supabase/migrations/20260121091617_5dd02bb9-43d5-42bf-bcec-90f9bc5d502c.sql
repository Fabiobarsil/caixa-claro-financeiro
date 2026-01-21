-- Create schedule_type enum
CREATE TYPE public.schedule_type AS ENUM ('single', 'installment', 'monthly_package');

-- Create entry_schedules table
CREATE TABLE public.entry_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  schedule_type public.schedule_type NOT NULL,
  installment_number INTEGER NOT NULL DEFAULT 1,
  installments_total INTEGER NOT NULL DEFAULT 1,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ NULL,
  status public.entry_status NOT NULL DEFAULT 'pendente',
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entry_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view entry_schedules"
ON public.entry_schedules
FOR SELECT
USING (true);

CREATE POLICY "Users can insert own entry_schedules"
ON public.entry_schedules
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entry_schedules"
ON public.entry_schedules
FOR UPDATE
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can delete entry_schedules"
ON public.entry_schedules
FOR DELETE
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_entry_schedules_updated_at
BEFORE UPDATE ON public.entry_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_entry_schedules_entry_id ON public.entry_schedules(entry_id);
CREATE INDEX idx_entry_schedules_user_id ON public.entry_schedules(user_id);
CREATE INDEX idx_entry_schedules_due_date ON public.entry_schedules(due_date);
CREATE INDEX idx_entry_schedules_status ON public.entry_schedules(status);