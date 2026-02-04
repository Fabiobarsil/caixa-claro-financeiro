-- Drop the old check constraint and add new one with all valid statuses
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status IN ('inactive', 'active', 'ativo', 'pendente', 'em_atraso', 'cancelado', 'expirado'));

-- Also update subscriptions table constraint
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_subscription_status_check;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_subscription_status_check 
CHECK (subscription_status IN ('inactive', 'active', 'ativo', 'pendente', 'em_atraso', 'cancelado', 'expirado'));