import type {
  inspectionItems,
  inspectionRooms,
  inspections,
  properties,
} from "@/db/schema";

/**
 * Local rows to the shape Postgres expects.
 *
 * Two conversions matter: SQLite stores times as integer epoch millis while
 * Postgres wants ISO strings, and every column the server owns
 * (received_at, ai_*, pdf_report_url) is omitted — it is not in the client's
 * column grants, so sending it would be rejected outright.
 */

const iso = (ms: number | null | undefined) =>
  ms == null ? null : new Date(ms).toISOString();

type Property = typeof properties.$inferSelect;
type Inspection = typeof inspections.$inferSelect;
type Room = typeof inspectionRooms.$inferSelect;
type Item = typeof inspectionItems.$inferSelect;

export function propertyToRemote(row: Property) {
  return {
    id: row.id,
    user_id: row.userId,
    address_line1: row.addressLine1,
    address_line2: row.addressLine2,
    city: row.city,
    state_province: row.stateProvince,
    postal_code: row.postalCode,
    property_type: row.propertyType,
    landlord_name: row.landlordName,
    landlord_email: row.landlordEmail,
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
    deleted_at: iso(row.deletedAt),
  };
}

export function inspectionToRemote(row: Inspection) {
  return {
    id: row.id,
    property_id: row.propertyId,
    user_id: row.userId,
    inspection_type: row.inspectionType,
    status: row.status,
    lease_start_date: row.leaseStartDate
      ? new Date(row.leaseStartDate).toISOString().slice(0, 10)
      : null,
    tenant_signature_url: row.tenantSignatureUrl,
    landlord_signature_url: row.landlordSignatureUrl,
    completed_at: iso(row.completedAt),
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
    deleted_at: iso(row.deletedAt),
  };
}

export function roomToRemote(row: Room, userId: string) {
  return {
    id: row.id,
    inspection_id: row.inspectionId,
    user_id: userId,
    room_name: row.roomName,
    order_index: row.orderIndex,
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
    deleted_at: iso(row.deletedAt),
  };
}

export function itemToRemote(row: Item) {
  return {
    id: row.id,
    room_id: row.roomId,
    user_id: row.userId,
    title: row.title,
    condition_status: row.conditionStatus,
    description: row.description,
    // Storage object path, filled once the blob upload succeeds.
    storage_path: row.remoteUrl,
    thumbnail_path: row.thumbnailUrl,
    latitude: row.latitude,
    longitude: row.longitude,
    altitude: row.altitude,
    heading: row.heading,
    captured_at: iso(row.capturedAt),
    image_hash: row.imageHash,
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
    deleted_at: iso(row.deletedAt),
  };
}
