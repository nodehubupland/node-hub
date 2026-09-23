-- Economy Test: schema only. Keep the economy_test feature flag false until a Upland sandbox/escrow integration is approved.
create table if not exists public.economy_feature_flags (
  key text primary key,
  enabled boolean not null default false,
  upland_fee_bps integer not null default 0 check (upland_fee_bps between 0 and 10000),
  node_hub_fee_bps integer not null default 0 check (node_hub_fee_bps between 0 and 10000),
  updated_at timestamptz not null default now()
);
insert into public.economy_feature_flags (key, enabled) values ('economy_test', false) on conflict (key) do nothing;

create table if not exists public.economy_player_accounts (
  user_id uuid primary key references auth.users(id) on delete restrict,
  available_upx numeric(20,0) not null default 0 check (available_upx >= 0),
  processing_upx numeric(20,0) not null default 0 check (processing_upx >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.economy_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('deposit')),
  requested_upx numeric(20,0) not null check (requested_upx > 0),
  upland_fee_upx numeric(20,0) not null default 0 check (upland_fee_upx >= 0),
  node_hub_fee_upx numeric(20,0) not null default 0 check (node_hub_fee_upx >= 0),
  status text not null default 'pending' check (status in ('pending','confirmed','failed')),
  external_reference text unique,
  failure_reason text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists economy_transactions_user_created_idx on public.economy_transactions (user_id, created_at desc);

create table if not exists public.economy_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.economy_transactions(id) on delete restrict,
  account_user_id uuid references auth.users(id) on delete restrict,
  entry_type text not null check (entry_type in ('player_available','player_processing','upland_fee','node_hub_fee','node_hub_cash')),
  amount_upx numeric(20,0) not null check (amount_upx <> 0),
  created_at timestamptz not null default now()
);
create index if not exists economy_ledger_transaction_idx on public.economy_ledger_entries (transaction_id);

create table if not exists public.economy_treasury_balances (
  bucket text primary key check (bucket in ('player_liabilities','in_transit','node_hub_fees','node_hub_cash')),
  amount_upx numeric(20,0) not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.economy_treasury_balances (bucket) values
 ('player_liabilities'),('in_transit'),('node_hub_fees'),('node_hub_cash')
on conflict (bucket) do nothing;

alter table public.economy_feature_flags enable row level security;
alter table public.economy_player_accounts enable row level security;
alter table public.economy_transactions enable row level security;
alter table public.economy_ledger_entries enable row level security;
alter table public.economy_treasury_balances enable row level security;

-- Owner/admin role is stored server-controlled in profiles.role. No client has write access to finance records.
create policy "economy reads enabled configuration" on public.economy_feature_flags for select to authenticated
 using (enabled or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner','admin')));
create policy "economy owner reads all accounts" on public.economy_player_accounts for select to authenticated
 using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner','admin')));
create policy "economy user reads own account" on public.economy_player_accounts for select to authenticated
 using ((select auth.uid()) = user_id);
create policy "economy owner reads all transactions" on public.economy_transactions for select to authenticated
 using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner','admin')));
create policy "economy user reads own transactions" on public.economy_transactions for select to authenticated
 using ((select auth.uid()) = user_id);
create policy "economy owner reads ledger" on public.economy_ledger_entries for select to authenticated
 using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner','admin')));
create policy "economy owner reads treasury" on public.economy_treasury_balances for select to authenticated
 using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner','admin')));

revoke all on public.economy_feature_flags, public.economy_player_accounts, public.economy_transactions, public.economy_ledger_entries, public.economy_treasury_balances from anon, authenticated;
grant select on public.economy_feature_flags, public.economy_player_accounts, public.economy_transactions, public.economy_ledger_entries, public.economy_treasury_balances to authenticated;