-- Node Hub V1: Upland account connection storage
create table if not exists public.upland_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_code text,
  upland_user_id uuid,
  access_token text,
  status text not null default 'pending' check (status in ('pending','connected','disconnected','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  connected_at timestamptz
);

create unique index if not exists upland_connections_user_id_uidx on public.upland_connections(user_id);
create unique index if not exists upland_connections_code_uidx on public.upland_connections(connection_code) where connection_code is not null;

alter table public.upland_connections enable row level security;

create policy "users read own upland connection" on public.upland_connections
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "users insert own upland connection" on public.upland_connections
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "users update own upland connection" on public.upland_connections
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
