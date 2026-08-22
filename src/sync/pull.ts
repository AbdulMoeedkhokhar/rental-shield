import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  inspectionItems,
  inspectionRooms,
  inspections,
  properties,
  userState,
} from "@/db/schema";
import { ensureUserState } from "@/db/repositories/user-state";
import { supabase } from "@/lib/supabase";

import { restoreThumbnail } from "./media";

const PAGE_SIZE = 200;

const ms = (iso: string | null | undefined) =>
  iso ? new Date(iso).getTime() : null;

/**
 * Pulls server rows into SQLite.
 *
 * Order matters and mirrors the foreign keys: a room cannot land before its
 * inspection exists locally. Paging is by server_updated_at, which the server
 * stamps on every write — a client-supplied timestamp would let a skewed clock
 * hide a row behind the cursor permanently.
 */
export async function pullChanges(userId: string) {
  // On a fresh install no user_state row exists yet, and the cursor write at
  // the end is an UPDATE — without this it would silently no-op and every
  // sync would re-pull the account from scratch.
  await ensureUserState(userId);

  const [state] = await db
    .select()
    .from(userState)
    .where(eq(userState.userId, userId))
    .limit(1);

  // Epoch start on a fresh install pulls everything the account owns.
  const cursor = state?.syncCursor ?? "1970-01-01T00:00:00.000Z";
  let high = cursor;
  let restored = 0;

  function advance(rows: { server_updated_at: string }[]) {
    for (const row of rows) {
      if (row.server_updated_at > high) high = row.server_updated_at;
    }
  }

  async function page(table: string) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .gt("server_updated_at", cursor)
      .order("server_updated_at", { ascending: true })
      .limit(PAGE_SIZE);
    if (error) throw error;
    return data ?? [];
  }

  // ---- properties
  const remoteProperties = await page("properties");
  for (const r of remoteProperties) {
    await db
      .insert(properties)
      .values({
        id: r.id,
        userId: r.user_id,
        addressLine1: r.address_line1,
        addressLine2: r.address_line2,
        city: r.city,
        stateProvince: r.state_province,
        postalCode: r.postal_code,
        propertyType: r.property_type,
        landlordName: r.landlord_name,
        landlordEmail: r.landlord_email,
        createdAt: ms(r.created_at) ?? Date.now(),
        updatedAt: ms(r.updated_at) ?? Date.now(),
        deletedAt: ms(r.deleted_at),
        syncedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: properties.id,
        set: {
          addressLine1: r.address_line1,
          addressLine2: r.address_line2,
          city: r.city,
          stateProvince: r.state_province,
          postalCode: r.postal_code,
          propertyType: r.property_type,
          landlordName: r.landlord_name,
          landlordEmail: r.landlord_email,
          updatedAt: ms(r.updated_at) ?? Date.now(),
          deletedAt: ms(r.deleted_at),
          syncedAt: Date.now(),
        },
      });
  }
  advance(remoteProperties);

  // ---- inspections
  const remoteInspections = await page("inspections");
  for (const r of remoteInspections) {
    await db
      .insert(inspections)
      .values({
        id: r.id,
        propertyId: r.property_id,
        userId: r.user_id,
        inspectionType: r.inspection_type,
        status: r.status,
        leaseStartDate: ms(r.lease_start_date),
        tenantSignatureUrl: r.tenant_signature_url,
        landlordSignatureUrl: r.landlord_signature_url,
        pdfReportUrl: r.pdf_report_url,
        reportHash: r.report_hash,
        completedAt: ms(r.completed_at),
        createdAt: ms(r.created_at) ?? Date.now(),
        updatedAt: ms(r.updated_at) ?? Date.now(),
        deletedAt: ms(r.deleted_at),
        syncedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: inspections.id,
        set: {
          status: r.status,
          tenantSignatureUrl: r.tenant_signature_url,
          landlordSignatureUrl: r.landlord_signature_url,
          // Server-generated: this is how a paid report reaches the device.
          pdfReportUrl: r.pdf_report_url,
          reportHash: r.report_hash,
          completedAt: ms(r.completed_at),
          updatedAt: ms(r.updated_at) ?? Date.now(),
          deletedAt: ms(r.deleted_at),
          syncedAt: Date.now(),
        },
      });
  }
  advance(remoteInspections);

  // ---- rooms
  const remoteRooms = await page("inspection_rooms");
  for (const r of remoteRooms) {
    await db
      .insert(inspectionRooms)
      .values({
        id: r.id,
        inspectionId: r.inspection_id,
        roomName: r.room_name,
        orderIndex: r.order_index,
        createdAt: ms(r.created_at) ?? Date.now(),
        updatedAt: ms(r.updated_at) ?? Date.now(),
        deletedAt: ms(r.deleted_at),
        syncedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: inspectionRooms.id,
        set: {
          roomName: r.room_name,
          orderIndex: r.order_index,
          updatedAt: ms(r.updated_at) ?? Date.now(),
          deletedAt: ms(r.deleted_at),
          syncedAt: Date.now(),
        },
      });
  }
  advance(remoteRooms);

  // ---- items
  const remoteItems = await page("inspection_items");
  for (const r of remoteItems) {
    // localUri is deliberately absent: the file is not on this device yet.
    // remoteUrl carries the storage path so media.ts can fetch it.
    await db
      .insert(inspectionItems)
      .values({
        id: r.id,
        roomId: r.room_id,
        userId: r.user_id,
        title: r.title,
        conditionStatus: r.condition_status,
        description: r.description,
        aiDamageDetected: !!r.ai_damage_detected,
        aiDamageSummary: r.ai_damage_summary,
        aiConfidenceScore: r.ai_confidence_score,
        localUri: null,
        remoteUrl: r.storage_path,
        thumbnailUrl: r.thumbnail_path,
        latitude: r.latitude,
        longitude: r.longitude,
        altitude: r.altitude,
        heading: r.heading,
        capturedAt: ms(r.captured_at) ?? Date.now(),
        imageHash: r.image_hash,
        createdAt: ms(r.created_at) ?? Date.now(),
        updatedAt: ms(r.updated_at) ?? Date.now(),
        deletedAt: ms(r.deleted_at),
        syncedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: inspectionItems.id,
        set: {
          conditionStatus: r.condition_status,
          description: r.description,
          aiDamageDetected: !!r.ai_damage_detected,
          aiDamageSummary: r.ai_damage_summary,
          aiConfidenceScore: r.ai_confidence_score,
          remoteUrl: r.storage_path,
          thumbnailUrl: r.thumbnail_path,
          updatedAt: ms(r.updated_at) ?? Date.now(),
          deletedAt: ms(r.deleted_at),
          syncedAt: Date.now(),
        },
      });
  }
  advance(remoteItems);

  // Fetch thumbnails for anything now missing its picture. Failures are
  // tolerated per item — a restore should not abort because one file 404s.
  for (const r of remoteItems) {
    const [row] = await db
      .select()
      .from(inspectionItems)
      .where(eq(inspectionItems.id, r.id))
      .limit(1);
    if (!row) continue;
    try {
      await restoreThumbnail(row);
      restored++;
    } catch {
      // Leave it; the next pass retries.
    }
  }

  if (high !== cursor) {
    await db
      .update(userState)
      .set({ syncCursor: high, updatedAt: Date.now() })
      .where(eq(userState.userId, userId));
  }

  const pulled =
    remoteProperties.length +
    remoteInspections.length +
    remoteRooms.length +
    remoteItems.length;

  // A full page probably means more is waiting; the caller loops.
  return { pulled, restored, more: remoteItems.length === PAGE_SIZE };
}
