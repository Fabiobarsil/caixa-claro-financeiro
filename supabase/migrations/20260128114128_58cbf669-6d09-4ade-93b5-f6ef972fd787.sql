-- Função helper para obter account_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- RLS Policies para accounts
CREATE POLICY "Users can view their own account"
ON public.accounts
FOR SELECT
USING (id = get_user_account_id());

CREATE POLICY "Admins can update their account"
ON public.accounts
FOR UPDATE
USING (id = get_user_account_id() AND is_admin());

CREATE POLICY "Service role can manage accounts"
ON public.accounts
FOR ALL
USING (auth.role() = 'service_role');