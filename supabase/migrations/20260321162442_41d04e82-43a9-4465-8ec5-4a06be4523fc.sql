
-- Add amount_paid column to transactions for partial payment tracking
ALTER TABLE public.transactions
  ADD COLUMN amount_paid numeric(12,2) DEFAULT 0;

-- Safety constraint: amount_paid cannot exceed amount
ALTER TABLE public.transactions
  ADD CONSTRAINT check_paid_limit CHECK (amount_paid <= amount);

-- Sync existing paid transactions: set amount_paid = amount for fully paid
UPDATE public.transactions
  SET amount_paid = amount
  WHERE status = 'pago';
