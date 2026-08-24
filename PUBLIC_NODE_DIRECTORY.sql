-- NODE HUB PUBLIC DIRECTORY
-- Run this once in the Supabase SQL Editor.
-- Allows the public website (anon) to read approved Nodes only.
-- Pending/rejected Nodes remain hidden from visitors.

drop policy if exists "Public can view approved nodes" on public.nodes;
create policy "Public can view approved nodes"
on public.nodes
for select
to anon, authenticated
using (status = 'approved');

-- Helpful index for the public directory query.
create index if not exists nodes_status_created_at_idx
on public.nodes (status, created_at desc);
