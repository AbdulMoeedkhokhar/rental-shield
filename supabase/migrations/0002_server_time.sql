-- Server-attested receipt time, plus the column privileges that protect it.
--
-- captured_at and the GPS fix both come from the device, and a device's clock
-- and location can be changed. received_at is written by Postgres, is in no
-- client grant, and is pinned on update — so it cannot be forged. It gives a
-- report a hard upper bound: "captured at T per the device, in our hands by
-- received_at".
--
-- Safe to re-run.

alter table public.properties        add column if not exists received_at timestamptz not null default now();
alter table public.inspections       add column if not exists received_at timestamptz not null default now();
alter table public.inspection_rooms  add column if not exists received_at timestamptz not null default now();
alter table public.inspection_items  add column if not exists received_at timestamptz not null default now();

-- ------------------------------------------------------------- privileges
--
-- The sync client upserts, and PostgREST compiles an upsert to
-- INSERT ... ON CONFLICT DO UPDATE SET <every column sent>. So UPDATE must be
-- granted on the same columns as INSERT, or replaying an already-synced row
-- fails with a permission error instead of being a harmless no-op.
--
-- Immutability is therefore enforced by the triggers below, not by withholding
-- the UPDATE grant. Columns absent from these lists entirely — received_at,
-- the ai_* verdicts, pdf_report_url, report_hash — remain server-only.

revoke all on public.properties, public.inspections,
              public.inspection_rooms, public.inspection_items
  from anon, authenticated;

grant select on public.properties, public.inspections,
                public.inspection_rooms, public.inspection_items
  to authenticated;

grant insert (id, user_id, address_line1, address_line2, city, state_province,
              postal_code, property_type, landlord_name, landlord_email,
              created_at, updated_at, deleted_at),
      update (id, user_id, address_line1, address_line2, city, state_province,
              postal_code, property_type, landlord_name, landlord_email,
              created_at, updated_at, deleted_at)
  on public.properties to authenticated;

grant insert (id, property_id, user_id, inspection_type, status,
              lease_start_date, tenant_signature_url, landlord_signature_url,
              completed_at, created_at, updated_at, deleted_at),
      update (id, property_id, user_id, inspection_type, status,
              lease_start_date, tenant_signature_url, landlord_signature_url,
              completed_at, created_at, updated_at, deleted_at)
  on public.inspections to authenticated;

grant insert (id, inspection_id, user_id, room_name, order_index,
              created_at, updated_at, deleted_at),
      update (id, inspection_id, user_id, room_name, order_index,
              created_at, updated_at, deleted_at)
  on public.inspection_rooms to authenticated;

grant insert (id, room_id, user_id, title, condition_status, description,
              storage_path, thumbnail_path, latitude, longitude, altitude,
              heading, captured_at, image_hash, created_at, updated_at, deleted_at),
      update (id, room_id, user_id, title, condition_status, description,
              storage_path, thumbnail_path, latitude, longitude, altitude,
              heading, captured_at, image_hash, created_at, updated_at, deleted_at)
  on public.inspection_items to authenticated;

-- -------------------------------------------------------------- immutability
--
-- These pin values to OLD rather than raising. A replayed upsert sends the
-- same values it originally sent, so pinning makes the retry a no-op; a
-- tampering attempt is silently neutralised rather than breaking the sync
-- queue for the honest case.

create or replace function public.pin_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id          := old.id;
  new.user_id     := old.user_id;   -- ownership can never be transferred
  new.created_at  := old.created_at;
  new.received_at := old.received_at;
  return new;
end;
$$;

-- Evidence columns: once a photo is recorded, its digest and capture time are
-- the claim. Allowing either to be rewritten would defeat the whole point.
create or replace function public.pin_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.image_hash  := old.image_hash;
  new.captured_at := old.captured_at;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['properties','inspections','inspection_rooms','inspection_items']
  loop
    execute format('drop trigger if exists pin_provenance_trg on public.%I', t);
    execute format('create trigger pin_provenance_trg before update on public.%I
                    for each row execute function public.pin_provenance()', t);
  end loop;
end $$;

drop trigger if exists pin_evidence_trg on public.inspection_items;
create trigger pin_evidence_trg
  before update on public.inspection_items
  for each row execute function public.pin_evidence();

-- PostgREST caches the schema, so a new column can still 404 after the DDL
-- lands. Supabase usually reloads on its own; this makes it immediate.
notify pgrst, 'reload schema';
