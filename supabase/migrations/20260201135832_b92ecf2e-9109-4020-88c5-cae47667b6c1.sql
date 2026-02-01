-- =====================================================
-- MIGRAÇÃO: entries -> transactions
-- Objetivo: Reestruturar lançamentos com relação 1:N a clientes
-- =====================================================

-- 1. Criar ENUM para type (entrada/saída)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('entrada', 'saida');
  END IF;
END $$;

-- 2. Criar ENUM para category
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_category') THEN
    CREATE TYPE transaction_category AS ENUM ('servico', 'produto', 'outro');
  END IF;
END $$;

-- 3. Renomear tabela entries para transactions
ALTER TABLE public.entries RENAME TO transactions;

-- 4. Adicionar novas colunas
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS type transaction_type DEFAULT 'entrada',
  ADD COLUMN IF NOT EXISTS category transaction_category DEFAULT 'servico',
  ADD COLUMN IF NOT EXISTS description text;

-- 5. Migrar dados existentes
-- type: lançamentos com valor positivo são 'entrada'
UPDATE public.transactions SET type = 'entrada' WHERE type IS NULL;

-- category: mapear de service_product_id
UPDATE public.transactions t
SET category = CASE 
  WHEN sp.type = 'servico' THEN 'servico'::transaction_category
  WHEN sp.type = 'produto' THEN 'produto'::transaction_category
  ELSE 'outro'::transaction_category
END
FROM public.services_products sp
WHERE t.service_product_id = sp.id;

-- description: usar nome do serviço/produto se existir
UPDATE public.transactions t
SET description = sp.name
FROM public.services_products sp
WHERE t.service_product_id = sp.id AND t.description IS NULL;

-- 6. Renomear coluna value para amount
ALTER TABLE public.transactions RENAME COLUMN value TO amount;

-- 7. Tornar type NOT NULL após migração
ALTER TABLE public.transactions ALTER COLUMN type SET NOT NULL;

-- 8. Criar índice em client_id para performance
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON public.transactions(client_id);

-- 9. Criar índice composto para relatórios por cliente
CREATE INDEX IF NOT EXISTS idx_transactions_client_date ON public.transactions(client_id, date DESC);

-- 10. Criar índice para account_id (multi-tenant performance)
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);

-- 11. Adicionar constraint para impedir deleção de cliente com lançamentos
-- (ON DELETE RESTRICT já é o padrão, mas vamos garantir)
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS entries_client_id_fkey;

ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES public.clients(id) 
  ON DELETE RESTRICT;

-- 12. Manter FK para service_product_id (opcional)
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS entries_service_product_id_fkey;

ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_service_product_id_fkey 
  FOREIGN KEY (service_product_id) 
  REFERENCES public.services_products(id) 
  ON DELETE SET NULL;

-- 13. Manter FK para account_id
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS entries_account_id_fkey;

ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_account_id_fkey 
  FOREIGN KEY (account_id) 
  REFERENCES public.accounts(id) 
  ON DELETE CASCADE;

-- 14. Recriar políticas RLS com novo nome da tabela
DROP POLICY IF EXISTS "entries_select_by_account" ON public.transactions;
DROP POLICY IF EXISTS "entries_insert_by_account" ON public.transactions;
DROP POLICY IF EXISTS "entries_update_by_account" ON public.transactions;
DROP POLICY IF EXISTS "entries_delete_by_account" ON public.transactions;

CREATE POLICY "transactions_select_by_account" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "transactions_insert_by_account" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "transactions_update_by_account" 
ON public.transactions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id())
WITH CHECK (auth.uid() IS NOT NULL AND account_id = current_account_id());

CREATE POLICY "transactions_delete_by_account" 
ON public.transactions 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND account_id = current_account_id() AND is_admin());

-- 15. Atualizar trigger de updated_at
DROP TRIGGER IF EXISTS update_entries_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 16. Atualizar entry_schedules FK
ALTER TABLE public.entry_schedules 
  DROP CONSTRAINT IF EXISTS entry_schedules_entry_id_fkey;

ALTER TABLE public.entry_schedules 
  ADD CONSTRAINT entry_schedules_transaction_id_fkey 
  FOREIGN KEY (entry_id) 
  REFERENCES public.transactions(id) 
  ON DELETE CASCADE;