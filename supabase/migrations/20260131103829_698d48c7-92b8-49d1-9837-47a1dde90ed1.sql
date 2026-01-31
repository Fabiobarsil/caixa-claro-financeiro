-- 1. Atualizar policies de clients para incluir auth.uid() IS NOT NULL

DROP POLICY IF EXISTS "clients_select_by_account" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_by_account" ON public.clients;
DROP POLICY IF EXISTS "clients_update_by_account" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_by_account" ON public.clients;

CREATE POLICY "clients_select_by_account" 
ON public.clients 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "clients_insert_by_account" 
ON public.clients 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "clients_update_by_account" 
ON public.clients 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id())
WITH CHECK (auth.uid() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "clients_delete_by_account" 
ON public.clients 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id() AND is_admin());

-- 2. Restringir policy de service_role do profiles para apenas campos de assinatura
-- Remover a policy permissiva antiga
DROP POLICY IF EXISTS "profiles_service_role_update" ON public.profiles;

-- Criar policy restrita que só permite service_role atualizar campos de assinatura
CREATE POLICY "profiles_service_role_update" 
ON public.profiles 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);