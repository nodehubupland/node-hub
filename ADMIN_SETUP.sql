-- NODE HUB ADMIN SETUP
-- Run this entire script once in Supabase SQL Editor.
-- It creates the role system and protects admin Node review actions with RLS.

-- 1. Add a role to profiles.
alter table public.profiles
    add column if not exists role text not null default 'user';

-- 2. Keep roles limited to the roles used by Node Hub.
alter table public.profiles
    drop constraint if exists profiles_role_check;

alter table public.profiles
    add constraint profiles_role_check
    check (role in ('user', 'moderator', 'admin', 'owner'));

-- 3. Make the current owner account the Node Hub Owner.
-- This is the authenticated user ID supplied during the project setup.
update public.profiles
set role = 'owner'
where id = '0bfe4c1f-6601-4c80-8ee4-5bcf66ea42d5';

-- 4. Secure role checks inside RLS.
create or replace function public.is_node_hub_staff()
returns boolean
language sql
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.profiles
        where id = (select auth.uid())
          and role in ('owner', 'admin', 'moderator')
    );
$$;

grant execute on function public.is_node_hub_staff() to authenticated;

-- 5. Staff can see all Node submissions so they can review pending Nodes.
drop policy if exists "Node staff can view all nodes" on public.nodes;
create policy "Node staff can view all nodes"
on public.nodes
for select
to authenticated
using ((select public.is_node_hub_staff()));

-- 6. Staff can change publication status and other Node fields.
-- Existing user INSERT policy is preserved.
drop policy if exists "Node staff can update nodes" on public.nodes;
create policy "Node staff can update nodes"
on public.nodes
for update
to authenticated
using ((select public.is_node_hub_staff()))
with check ((select public.is_node_hub_staff()));

-- 7. Keep an index for the ownership/RLS checks.
create index if not exists profiles_id_role_idx
on public.profiles (id, role);

create index if not exists nodes_user_id_idx
on public.nodes (user_id);

-- IMPORTANT:
-- Do not put a service_role key in the website.
-- Admin authorization is enforced by PostgreSQL RLS, not only by the UI.
