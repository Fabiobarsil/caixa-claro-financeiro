-- 0) Extensão para UUID (se já existir, não tem problema)
create extension if not exists "pgcrypto";

-- 1) Tabela de contas (tenant)
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS on accounts
alter table public.accounts enable row level security;

-- 2) Adiciona account_id em profiles
alter table public.profiles
add column if not exists account_id uuid references public.accounts(id);

create index if not exists idx_profiles_account_id on public.profiles(account_id);

-- 3) Adiciona account_id nas tabelas principais
alter table public.clients add column if not exists account_id uuid references public.accounts(id);
alter table public.entries add column if not exists account_id uuid references public.accounts(id);
alter table public.entry_schedules add column if not exists account_id uuid references public.accounts(id);
alter table public.expenses add column if not exists account_id uuid references public.accounts(id);
alter table public.services_products add column if not exists account_id uuid references public.accounts(id);
alter table public.subscriptions add column if not exists account_id uuid references public.accounts(id);
alter table public.terms_acceptance add column if not exists account_id uuid references public.accounts(id);
alter table public.smart_states add column if not exists account_id uuid references public.accounts(id);

-- Índices para performance
create index if not exists idx_clients_account_id on public.clients(account_id);
create index if not exists idx_entries_account_id on public.entries(account_id);
create index if not exists idx_entry_schedules_account_id on public.entry_schedules(account_id);
create index if not exists idx_expenses_account_id on public.expenses(account_id);
create index if not exists idx_services_products_account_id on public.services_products(account_id);
create index if not exists idx_subscriptions_account_id on public.subscriptions(account_id);
create index if not exists idx_terms_acceptance_account_id on public.terms_acceptance(account_id);
create index if not exists idx_smart_states_account_id on public.smart_states(account_id);