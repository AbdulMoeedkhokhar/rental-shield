-- RentalShield initial schema.
--
-- Security posture: every table is RLS-enabled and denies by default. A user
-- reaches only rows where user_id = auth.uid(). Nothing here trusts a value
-- the client sends for ownership or entitlement.

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  -- Entitlement cache. RevenueCat is the source of truth and writes this via
  -- webhook using the service role. The UPDATE grant below deliberately omits
  -- this column, so a client cannot promote itself to Pro.
  is_pro      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are self-readable" on public.profiles;
create policy "profiles are self-readable"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles are self-writable" on public.profiles;
create policy "profiles are self-writable"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Column-level grants: RLS controls which ROWS are reachable, grants control
-- which COLUMNS. Both are needed — an RLS policy alone would let the owner
-- update is_pro.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

-- A profile must exist for every auth user, created server-side so signup
-- cannot proceed without one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''   -- pinned: an unqualified name must never resolve to a
                       -- caller-controlled schema in a SECURITY DEFINER body
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: the trigger above only fires on INSERT, so anyone who signed up
-- before this migration ran has no profile row.
insert into public.profiles (id, full_name)
select id, raw_user_meta_data ->> 'full_name'
from auth.users
on conflict (id) do nothing;

-- ------------------------------------------------------------ app tables

create table if not exists public.properties (
  id              uuid primary key,          -- client-minted UUIDv7
  user_id         uuid not null references auth.users(id) on delete cascade,
  address_line1   text not null,
  address_line2   text,
  city            text not null,
  state_province  text,
  postal_code     text,
  property_type   text not null default 'Apartment',
  landlord_name   text,
  landlord_email  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table if not exists public.inspections (
  id                      uuid primary key,
  property_id             uuid not null references public.properties(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  inspection_type         text not null check (inspection_type in ('move_in','move_out','routine')),
  status                  text not null default 'draft' check (status in ('draft','in_progress','completed')),
  lease_start_date        date,
  tenant_signature_url    text,
  landlord_signature_url  text,
  pdf_report_url          text,
  report_hash             text,
  completed_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);

create table if not exists public.inspection_rooms (
  id             uuid primary key,
  inspection_id  uuid not null references public.inspections(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  room_name      text not null,
  order_index    int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table if not exists public.inspection_items (
  id                   uuid primary key,
  room_id              uuid not null references public.inspection_rooms(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  title                text not null,
  condition_status     text not null check (condition_status in ('pristine','normal_wear','minor_scuff','damaged')),
  description          text,
  ai_damage_detected   boolean not null default false,
  ai_damage_summary    text,
  ai_confidence_score  numeric(4,3),
  -- Storage object path, not a public URL. Reads go through signed URLs.
  storage_path         text,
  thumbnail_path       text,
  latitude             numeric(9,6),
  longitude            numeric(9,6),
  altitude             numeric(9,3),
  heading              numeric(6,3),
  captured_at          timestamptz not null,
  image_hash           text not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create index if not exists properties_user_idx on public.properties(user_id) where deleted_at is null;
create index if not exists inspections_property_idx on public.inspections(property_id) where deleted_at is null;
create index if not exists rooms_inspection_idx on public.inspection_rooms(inspection_id) where deleted_at is null;
create index if not exists items_room_idx on public.inspection_items(room_id) where deleted_at is null;

-- Identical owner-only policy on each table. WITH CHECK on insert/update is
-- what stops a client writing rows owned by someone else.
do $$
declare t text;
begin
  foreach t in array array['properties','inspections','inspection_rooms','inspection_items']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner can read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "owner can insert %1$s" on public.%1$I', t);
    execute format('drop policy if exists "owner can update %1$s" on public.%1$I', t);
    execute format($p$create policy "owner can read %1$s" on public.%1$I
                     for select using (auth.uid() = user_id)$p$, t);
    execute format($p$create policy "owner can insert %1$s" on public.%1$I
                     for insert with check (auth.uid() = user_id)$p$, t);
    execute format($p$create policy "owner can update %1$s" on public.%1$I
                     for update using (auth.uid() = user_id)
                     with check (auth.uid() = user_id)$p$, t);
  end loop;
end $$;

-- No delete policy anywhere: deletes are soft (deleted_at) so they can be
-- replayed by the sync queue. Absent policy = denied.

-- --------------------------------------------------------------- quota

-- Server-authoritative counts for free-tier reconciliation. SECURITY INVOKER
-- so RLS applies and a user can only ever count their own rows.
create or replace function public.usage_counts()
returns table (properties bigint, photos bigint)
language sql
security invoker
stable
set search_path = ''
as $$
  select
    (select count(*) from public.properties
      where user_id = auth.uid() and deleted_at is null),
    (select count(*) from public.inspection_items
      where user_id = auth.uid() and deleted_at is null);
$$;

-- -------------------------------------------------------------- storage

insert into storage.buckets (id, name, public)
values ('inspection-photos', 'inspection-photos', false)
on conflict (id) do nothing;

-- Objects live under <user_id>/..., so the first path segment is the owner.
drop policy if exists "owner can read own photos" on storage.objects;
create policy "owner can read own photos"
  on storage.objects for select
  using (
    bucket_id = 'inspection-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owner can upload own photos" on storage.objects;
create policy "owner can upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'inspection-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
