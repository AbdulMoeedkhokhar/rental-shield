-- A cursor column the client cannot influence.
--
-- Pulling changes needs an ordering key. updated_at is unusable for that: it
-- comes from the device, so two phones with skewed clocks would interleave
-- wrongly and a backdated row would be skipped forever. received_at is
-- server-written but pinned on update, so it never moves after insert.
--
-- server_updated_at is set by the server on every write, so it is monotonic
-- per row and safe to page through.
--
-- Safe to re-run.

alter table public.properties        add column if not exists server_updated_at timestamptz not null default now();
alter table public.inspections       add column if not exists server_updated_at timestamptz not null default now();
alter table public.inspection_rooms  add column if not exists server_updated_at timestamptz not null default now();
alter table public.inspection_items  add column if not exists server_updated_at timestamptz not null default now();

create or replace function public.stamp_server_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['properties','inspections','inspection_rooms','inspection_items']
  loop
    execute format('drop trigger if exists stamp_server_updated_at_trg on public.%I', t);
    -- Runs after pin_provenance alphabetically, which is fine: the two touch
    -- disjoint columns.
    execute format('create trigger stamp_server_updated_at_trg
                    before insert or update on public.%I
                    for each row execute function public.stamp_server_updated_at()', t);
    execute format('create index if not exists %I on public.%I (user_id, server_updated_at)',
                   t || '_pull_idx', t);
  end loop;
end $$;

-- Not in any client grant, so it stays server-owned like received_at.

-- PostgREST caches the schema, so a new column can still 404 after the DDL
-- lands. Supabase usually reloads on its own; this makes it immediate.
notify pgrst, 'reload schema';
