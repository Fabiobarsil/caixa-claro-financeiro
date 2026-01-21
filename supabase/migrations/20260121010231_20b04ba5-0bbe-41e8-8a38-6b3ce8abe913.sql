-- Add due_date and payment_date columns to entries table
ALTER TABLE public.entries 
ADD COLUMN due_date date,
ADD COLUMN payment_date date;

-- Set due_date = date for existing pending entries
UPDATE public.entries 
SET due_date = date 
WHERE status = 'pendente' AND due_date IS NULL;

-- Set payment_date = date for existing paid entries
UPDATE public.entries 
SET payment_date = date 
WHERE status = 'pago' AND payment_date IS NULL;