import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Local SQLite schema. This is the source of truth while offline; Postgres is
 * a replica that catches up. Three conventions hold across every table:
 *
 *  - `id` is a client-minted UUIDv7 (see lib/ids.ts), never server-assigned.
 *  - Deletes are soft (`deletedAt`), because a hard delete cannot be replayed
 *    to a server that has not seen the row yet.
 *  - `syncedAt` is null until the row has been accepted remotely.
 */

const timestamps = {
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deletedAt: integer("deleted_at"),
  syncedAt: integer("synced_at"),
};

export const properties = sqliteTable(
  "properties",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    stateProvince: text("state_province"),
    postalCode: text("postal_code"),
    propertyType: text("property_type").notNull().default("Apartment"),
    landlordName: text("landlord_name"),
    landlordEmail: text("landlord_email"),
    ...timestamps,
  },
  (t) => [index("properties_user_idx").on(t.userId, t.deletedAt)]
);

export const inspections = sqliteTable(
  "inspections",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    // 'move_in' | 'move_out' | 'routine'
    inspectionType: text("inspection_type").notNull(),
    // 'draft' | 'in_progress' | 'completed'
    status: text("status").notNull().default("draft"),
    leaseStartDate: integer("lease_start_date"),

    // Signatures and the report exist locally first, then remotely.
    tenantSignatureUri: text("tenant_signature_uri"),
    tenantSignatureUrl: text("tenant_signature_url"),
    landlordSignatureUri: text("landlord_signature_uri"),
    landlordSignatureUrl: text("landlord_signature_url"),
    pdfReportUrl: text("pdf_report_url"),
    reportHash: text("report_hash"),

    completedAt: integer("completed_at"),
    ...timestamps,
  },
  (t) => [index("inspections_property_idx").on(t.propertyId, t.deletedAt)]
);

export const inspectionRooms = sqliteTable(
  "inspection_rooms",
  {
    id: text("id").primaryKey(),
    inspectionId: text("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    roomName: text("room_name").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("rooms_inspection_idx").on(t.inspectionId, t.deletedAt)]
);

export const inspectionItems = sqliteTable(
  "inspection_items",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => inspectionRooms.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    // 'pristine' | 'normal_wear' | 'minor_scuff' | 'damaged'
    conditionStatus: text("condition_status").notNull(),
    description: text("description"),

    aiDamageDetected: integer("ai_damage_detected", { mode: "boolean" })
      .notNull()
      .default(false),
    aiDamageSummary: text("ai_damage_summary"),
    aiConfidenceScore: real("ai_confidence_score"),

    // At capture time the file exists locally and has no remote path; after a
    // restore on a new install it is the other way round. Both are therefore
    // nullable, with the invariant that at least one is set.
    localUri: text("local_uri"),
    remoteUrl: text("remote_url"),
    thumbnailUri: text("thumbnail_uri"),
    thumbnailUrl: text("thumbnail_url"),

    latitude: real("latitude"),
    longitude: real("longitude"),
    altitude: real("altitude"),
    heading: real("heading"),
    capturedAt: integer("captured_at").notNull(),
    // SHA-256 of the raw frame, taken before any downsampling.
    imageHash: text("image_hash").notNull(),
    ...timestamps,
  },
  (t) => [
    index("items_room_idx").on(t.roomId, t.deletedAt),
    index("items_user_idx").on(t.userId, t.deletedAt),
  ]
);

/**
 * Ordered mutation queue. A per-row `sync_status` flag cannot express ordering,
 * retries, or partial failure — replaying "create room, add photo, upload blob"
 * after two days offline requires a log, so this is one.
 *
 * Integer primary key gives us insertion order for free.
 */
export const outbox = sqliteTable(
  "outbox",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // 'property' | 'inspection' | 'room' | 'item' | 'blob'
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    // 'insert' | 'update' | 'delete' | 'upload'
    op: text("op").notNull(),
    payload: text("payload", { mode: "json" }),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: integer("created_at").notNull(),
    /** Backoff gate: the drainer skips rows scheduled for the future. */
    availableAt: integer("available_at").notNull().default(0),
  },
  (t) => [index("outbox_ready_idx").on(t.availableAt, t.id)]
);

/**
 * Per-user cache of server-authoritative facts.
 *
 * Quota counts live here rather than being derived purely from local rows: a
 * local COUNT(*) resets on reinstall, which would hand out a fresh free tier
 * every time the app is deleted. The effective count is max(local, server).
 */
export const userState = sqliteTable("user_state", {
  userId: text("user_id").primaryKey(),
  isPro: integer("is_pro", { mode: "boolean" }).notNull().default(false),
  serverPropertyCount: integer("server_property_count").notNull().default(0),
  serverPhotoCount: integer("server_photo_count").notNull().default(0),
  entitlementCheckedAt: integer("entitlement_checked_at"),
  syncCursor: text("sync_cursor"),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`0`),
});
