-- Strengthen multi-tenant isolation: Add NOT NULL constraints to account_id columns

-- For clients table
ALTER TABLE public.clients 
ALTER COLUMN account_id SET NOT NULL;

-- For entries table  
ALTER TABLE public.entries
ALTER COLUMN account_id SET NOT NULL;

-- For entry_schedules table
ALTER TABLE public.entry_schedules
ALTER COLUMN account_id SET NOT NULL;

-- For expenses table
ALTER TABLE public.expenses
ALTER COLUMN account_id SET NOT NULL;

-- For services_products table
ALTER TABLE public.services_products
ALTER COLUMN account_id SET NOT NULL;

-- For smart_states table
ALTER TABLE public.smart_states
ALTER COLUMN account_id SET NOT NULL;

-- For subscriptions table
ALTER TABLE public.subscriptions
ALTER COLUMN account_id SET NOT NULL;

-- Add comments documenting the multi-tenant isolation requirement
COMMENT ON COLUMN public.clients.account_id IS 'Multi-tenant isolation: Required. Links to parent account.';
COMMENT ON COLUMN public.entries.account_id IS 'Multi-tenant isolation: Required. Links to parent account.';
COMMENT ON COLUMN public.expenses.account_id IS 'Multi-tenant isolation: Required. Links to parent account.';