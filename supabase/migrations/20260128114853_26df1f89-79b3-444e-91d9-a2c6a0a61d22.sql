-- Primeiro, remover políticas antigas baseadas em user_id
DROP POLICY IF EXISTS "Admins can delete entries" ON public.entries;
DROP POLICY IF EXISTS "Users can insert entries" ON public.entries;
DROP POLICY IF EXISTS "Users can update own pending entries" ON public.entries;
DROP POLICY IF EXISTS "Users can view entries" ON public.entries;

-- Criar novas políticas baseadas em account_id
CREATE POLICY "entries_select_by_account"
ON public.entries
FOR SELECT
USING (account_id = public.current_account_id());

CREATE POLICY "entries_insert_by_account"
ON public.entries
FOR INSERT
WITH CHECK (account_id = public.current_account_id());

CREATE POLICY "entries_update_by_account"
ON public.entries
FOR UPDATE
USING (account_id = public.current_account_id())
WITH CHECK (account_id = public.current_account_id());

CREATE POLICY "entries_delete_by_account"
ON public.entries
FOR DELETE
USING (account_id = public.current_account_id() AND is_admin());