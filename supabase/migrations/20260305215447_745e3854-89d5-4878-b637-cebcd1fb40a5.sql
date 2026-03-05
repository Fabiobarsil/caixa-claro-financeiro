ALTER TABLE public.entry_schedules
  ADD COLUMN IF NOT EXISTS payment_method_used text,
  ADD COLUMN IF NOT EXISTS payment_notes text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric;