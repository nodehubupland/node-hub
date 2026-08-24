-- NODE HUB
-- Add direct Upland Node link to the nodes table.
-- Run this once in Supabase SQL Editor.

alter table public.nodes
add column if not exists upland_node_url text;
