-- 1. Melhorar segurança da tabela clients adicionando validação extra
-- Adicionar check para garantir que current_account_id() retorne valor não-nulo

DROP POLICY IF EXISTS "clients_select_by_account" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_by_account" ON public.clients;
DROP POLICY IF EXISTS "clients_update_by_account" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_by_account" ON public.clients;

CREATE POLICY "clients_select_by_account" ON public.clients
  FOR SELECT USING (
    auth.uid() IS NOT NULL 
    AND current_account_id() IS NOT NULL
    AND account_id = current_account_id()
  );

CREATE POLICY "clients_insert_by_account" ON public.clients
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND current_account_id() IS NOT NULL
    AND account_id = current_account_id()
  );

CREATE POLICY "clients_update_by_account" ON public.clients
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND current_account_id() IS NOT NULL
    AND account_id = current_account_id()
  ) WITH CHECK (
    auth.uid() IS NOT NULL 
    AND current_account_id() IS NOT NULL
    AND account_id = current_account_id()
  );

CREATE POLICY "clients_delete_by_account" ON public.clients
  FOR DELETE USING (
    auth.uid() IS NOT NULL 
    AND current_account_id() IS NOT NULL
    AND account_id = current_account_id() 
    AND is_admin()
  );

-- 2. Corrigir política de service_role no profiles para ser mais restritiva
-- Limitar explicitamente ao service_role e remover o USING (true) genérico

DROP POLICY IF EXISTS "profiles_service_role_update" ON public.profiles;

CREATE POLICY "profiles_service_role_update" ON public.profiles
  FOR UPDATE USING (
    auth.role() = 'service_role'
  ) WITH CHECK (
    auth.role() = 'service_role'
  );