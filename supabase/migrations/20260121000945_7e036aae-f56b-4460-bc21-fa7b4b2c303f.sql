-- Adicionar campos faltantes na tabela services_products
ALTER TABLE public.services_products 
ADD COLUMN IF NOT EXISTS cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes text;

-- Renomear price para base_price se ainda não foi renomeado
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services_products' AND column_name = 'price') THEN
    ALTER TABLE public.services_products RENAME COLUMN price TO base_price;
  END IF;
END $$;