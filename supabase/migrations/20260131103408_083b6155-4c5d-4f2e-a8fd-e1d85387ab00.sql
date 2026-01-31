-- Atualizar policies de profiles para incluir verificação explícita de autenticação

-- Remover policies existentes de SELECT
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_by_account_admin" ON public.profiles;

-- Recriar policies com auth.uid() IS NOT NULL explícito
CREATE POLICY "profiles_select_own" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "profiles_select_by_account_admin" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id() AND is_admin());