-- Dual signatures, stored as SVG path data rather than image files.
--
-- A signature is a few KB of vector text. Keeping it on the row means it syncs
-- with the inspection, needs no storage object or signed URL, and the PDF
-- renderer can draw it at any resolution. An image would need all three.
--
-- Safe to re-run.

alter table public.inspections
  add column if not exists tenant_signature      text,
  add column if not exists tenant_signed_at      timestamptz,
  add column if not exists tenant_signer_name    text,
  add column if not exists landlord_signature    text,
  add column if not exists landlord_signed_at    timestamptz,
  add column if not exists landlord_signer_name  text;

-- Extend the client's write grants to cover the new columns. The existing
-- lists are replaced wholesale because GRANT is additive per column.
grant insert (id, property_id, user_id, inspection_type, status,
              lease_start_date, tenant_signature, tenant_signed_at,
              tenant_signer_name, landlord_signature, landlord_signed_at,
              landlord_signer_name, completed_at, created_at, updated_at,
              deleted_at),
      update (id, property_id, user_id, inspection_type, status,
              lease_start_date, tenant_signature, tenant_signed_at,
              tenant_signer_name, landlord_signature, landlord_signed_at,
              landlord_signer_name, completed_at, created_at, updated_at,
              deleted_at)
  on public.inspections to authenticated;

-- Once an inspection is signed and completed its evidence is fixed. Later
-- edits to the signatures or the completion time would let someone re-sign a
-- report after a dispute started, so they are pinned from that point on.
create or replace function public.pin_signed_inspection()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'completed' then
    new.tenant_signature     := old.tenant_signature;
    new.tenant_signed_at     := old.tenant_signed_at;
    new.tenant_signer_name   := old.tenant_signer_name;
    new.landlord_signature   := old.landlord_signature;
    new.landlord_signed_at   := old.landlord_signed_at;
    new.landlord_signer_name := old.landlord_signer_name;
    new.completed_at         := old.completed_at;
    new.status               := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists pin_signed_inspection_trg on public.inspections;
create trigger pin_signed_inspection_trg
  before update on public.inspections
  for each row execute function public.pin_signed_inspection();

notify pgrst, 'reload schema';
