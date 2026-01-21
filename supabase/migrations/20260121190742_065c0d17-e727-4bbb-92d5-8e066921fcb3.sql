-- Adicionar campos para controle de status e férias do usuário
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS vacation_start date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vacation_end date DEFAULT NULL;

-- Criar índice para consultas por status ativo
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.is_active IS 'Indica se o usuário está ativo no sistema';
COMMENT ON COLUMN public.profiles.vacation_start IS 'Data de início das férias (opcional)';
COMMENT ON COLUMN public.profiles.vacation_end IS 'Data de término das férias (opcional)';