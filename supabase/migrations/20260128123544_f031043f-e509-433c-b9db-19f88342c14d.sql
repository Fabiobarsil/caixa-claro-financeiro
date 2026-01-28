
-- =====================================================
-- MULTI-TENANT RLS MIGRATION - ISOLAMENTO COMPLETO
-- =====================================================

-- 1. CLIENTS - Atualizar para isolamento por account_id
DROP POLICY IF EXISTS "Users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

CREATE POLICY "clients_select_by_account"
ON public.clients FOR SELECT
USING (account_id = public.current_account_id());

CREATE POLICY "clients_insert_by_account"
ON public.clients FOR INSERT
WITH CHECK (account_id = public.current_account_id());

CREATE POLICY "clients_update_by_account"
ON public.clients FOR UPDATE
USING (account_id = public.current_account_id())
WITH CHECK (account_id = public.current_account_id());

CREATE POLICY "clients_delete_by_account"
ON public.clients FOR DELETE
USING (account_id = public.current_account_id() AND is_admin());

-- 2. ENTRY_SCHEDULES - Atualizar para isolamento por account_id
DROP POLICY IF EXISTS "Users can view entry_schedules" ON public.entry_schedules;
DROP POLICY IF EXISTS "Users can insert own entry_schedules" ON public.entry_schedules;
DROP POLICY IF EXISTS "Users can mark pending as paid" ON public.entry_schedules;
DROP POLICY IF EXISTS "Admins can update any schedule status" ON public.entry_schedules;
DROP POLICY IF EXISTS "Admins can delete entry_schedules" ON public.entry_schedules;

CREATE POLICY "entry_schedules_select_by_account"
ON public.entry_schedules FOR SELECT
USING (account_id = public.current_account_id());

CREATE POLICY "entry_schedules_insert_by_account"
ON public.entry_schedules FOR INSERT
WITH CHECK (account_id = public.current_account_id());

CREATE POLICY "entry_schedules_update_by_account"
ON public.entry_schedules FOR UPDATE
USING (account_id = public.current_account_id())
WITH CHECK (account_id = public.current_account_id());

CREATE POLICY "entry_schedules_delete_by_account"
ON public.entry_schedules FOR DELETE
USING (account_id = public.current_account_id() AND is_admin());

-- 3. EXPENSES - Atualizar para isolamento por account_id
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;

CREATE POLICY "expenses_select_by_account"
ON public.expenses FOR SELECT
USING (account_id = public.current_account_id());

CREATE POLICY "expenses_insert_by_account"
ON public.expenses FOR INSERT
WITH CHECK (account_id = public.current_account_id());

CREATE POLICY "expenses_update_by_account"
ON public.expenses FOR UPDATE
USING (account_id = public.current_account_id())
WITH CHECK (account_id = public.current_account_id());

CREATE POLICY "expenses_delete_by_account"
ON public.expenses FOR DELETE
USING (account_id = public.current_account_id() AND is_admin());

-- 4. SERVICES_PRODUCTS - Atualizar para isolamento por account_id
DROP POLICY IF EXISTS "Users can view services_products" ON public.services_products;
DROP POLICY IF EXISTS "Admins can insert services_products" ON public.services_products;
DROP POLICY IF EXISTS "Admins can update services_products" ON public.services_products;
DROP POLICY IF EXISTS "Admins can delete services_products" ON public.services_products;

CREATE POLICY "services_products_select_by_account"
ON public.services_products FOR SELECT
USING (account_id = public.current_account_id());

CREATE POLICY "services_products_insert_by_account"
ON public.services_products FOR INSERT
WITH CHECK (account_id = public.current_account_id());

CREATE POLICY "services_products_update_by_account"
ON public.services_products FOR UPDATE
USING (account_id = public.current_account_id())
WITH CHECK (account_id = public.current_account_id());

CREATE POLICY "services_products_delete_by_account"
ON public.services_products FOR DELETE
USING (account_id = public.current_account_id() AND is_admin());

-- 5. SMART_STATES - Atualizar para isolamento por account_id
DROP POLICY IF EXISTS "Users can view own smart_states" ON public.smart_states;

CREATE POLICY "smart_states_select_by_account"
ON public.smart_states FOR SELECT
USING (account_id = public.current_account_id());

CREATE POLICY "smart_states_insert_by_account"
ON public.smart_states FOR INSERT
WITH CHECK (account_id = public.current_account_id());

-- 6. TERMS_ACCEPTANCE - Atualizar para isolamento por account_id
DROP POLICY IF EXISTS "Users can view own acceptances" ON public.terms_acceptance;
DROP POLICY IF EXISTS "Users can insert own acceptance" ON public.terms_acceptance;

CREATE POLICY "terms_acceptance_select_by_account"
ON public.terms_acceptance FOR SELECT
USING (account_id = public.current_account_id());

CREATE POLICY "terms_acceptance_insert_by_account"
ON public.terms_acceptance FOR INSERT
WITH CHECK (account_id = public.current_account_id());

-- 7. SUBSCRIPTIONS - Atualizar para isolamento por account_id
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can update own subscription" ON public.subscriptions;

CREATE POLICY "subscriptions_select_by_account"
ON public.subscriptions FOR SELECT
USING (account_id = public.current_account_id());

CREATE POLICY "subscriptions_insert_by_account"
ON public.subscriptions FOR INSERT
WITH CHECK (account_id = public.current_account_id());

CREATE POLICY "subscriptions_update_by_account"
ON public.subscriptions FOR UPDATE
USING (account_id = public.current_account_id())
WITH CHECK (account_id = public.current_account_id());

-- 8. PROFILES - Atualizar para isolamento por account_id (mantendo visão de admins para equipe)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles for webhooks" ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "profiles_select_by_account_admin"
ON public.profiles FOR SELECT
USING (account_id = public.current_account_id() AND is_admin());

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_by_admin"
ON public.profiles FOR UPDATE
USING (account_id = public.current_account_id() AND is_admin())
WITH CHECK (account_id = public.current_account_id());

-- Service role para webhooks (mantendo)
CREATE POLICY "profiles_service_role_update"
ON public.profiles FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- 9. Atualizar handle_new_user para criar account automaticamente para novos admins
-- e herdar account_id do convite para operadores
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id uuid;
  invited_role app_role;
  inviter_account_id uuid;
BEGIN
  -- Verificar se foi criado via convite (operador)
  invited_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'admin');
  
  IF invited_role = 'operador' THEN
    -- Operador: herdar account_id do admin que convidou (vem nos metadata)
    inviter_account_id := (NEW.raw_user_meta_data->>'account_id')::uuid;
    
    IF inviter_account_id IS NULL THEN
      RAISE EXCEPTION 'Operadores devem ser convidados por um admin com account_id válido';
    END IF;
    
    new_account_id := inviter_account_id;
  ELSE
    -- Admin: criar nova account
    INSERT INTO public.accounts (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'name', 'Minha Empresa'))
    RETURNING id INTO new_account_id;
  END IF;
  
  -- Criar profile com account_id
  INSERT INTO public.profiles (user_id, name, email, account_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), 
    NEW.email,
    new_account_id
  );
  
  -- Atribuir role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, invited_role);
  
  RETURN NEW;
END;
$$;
