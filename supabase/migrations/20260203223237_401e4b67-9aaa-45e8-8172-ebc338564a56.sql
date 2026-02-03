-- 1. Delete transactions without client (orphan records)
DELETE FROM public.transactions WHERE client_id IS NULL;

-- 2. Drop existing FK if it exists and recreate with ON DELETE RESTRICT
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_client_id_fkey;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE RESTRICT;

-- 3. Make client_id NOT NULL (now safe since we deleted NULL records)
ALTER TABLE public.transactions
ALTER COLUMN client_id SET NOT NULL;