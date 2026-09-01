import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { enqueue } from "@/db/outbox";
import { inspectionItems, inspectionRooms, inspections } from "@/db/schema";
import { ROOM_TEMPLATES } from "@/constants/checklist";
import { InspectionSealedError } from "@/lib/entitlement";
import { newId } from "@/lib/ids";

export type InspectionType = "move_in" | "move_out" | "routine";

export async function listInspections(propertyId: string) {
  return db
    .select()
    .from(inspections)
    .where(
      and(eq(inspections.propertyId, propertyId), isNull(inspections.deletedAt))
    )
    .orderBy(desc(inspections.createdAt));
}

export async function listRooms(inspectionId: string) {
  return db
    .select()
    .from(inspectionRooms)
    .where(
      and(
        eq(inspectionRooms.inspectionId, inspectionId),
        isNull(inspectionRooms.deletedAt)
      )
    )
    .orderBy(asc(inspectionRooms.orderIndex));
}

/**
 * Creates an inspection and seeds its room matrix in one transaction, so an
 * interrupted create can never leave an inspection with no rooms.
 */
export async function createInspection(
  userId: string,
  propertyId: string,
  inspectionType: InspectionType,
  rooms: readonly string[] = ROOM_TEMPLATES
) {
  const now = Date.now();
  const inspection = {
    id: newId(),
    propertyId,
    userId,
    inspectionType,
    status: "draft" as const,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncedAt: null,
  };

  await db.transaction(async (tx) => {
    await tx.insert(inspections).values(inspection);
    await enqueue(tx, {
      entity: "inspection",
      entityId: inspection.id,
      op: "insert",
    });

    for (const [orderIndex, roomName] of rooms.entries()) {
      const room = {
        id: newId(),
        inspectionId: inspection.id,
        roomName,
        orderIndex,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncedAt: null,
      };
      await tx.insert(inspectionRooms).values(room);
      await enqueue(tx, { entity: "room", entityId: room.id, op: "insert" });
    }
  });

  return inspection;
}

export type SignatureInput = {
  tenantSignature: string;
  tenantSignerName: string;
  landlordSignature?: string | null;
  landlordSignerName?: string | null;
};

/** Aggregate counts for the review screen, in one query rather than per room. */
export async function inspectionSummary(inspectionId: string) {
  const rows = await db
    .select({
      roomId: inspectionRooms.id,
      roomName: inspectionRooms.roomName,
      orderIndex: inspectionRooms.orderIndex,
      photoCount: sql<number>`count(${inspectionItems.id})`,
      damaged: sql<number>`sum(case when ${inspectionItems.conditionStatus} in ('minor_scuff','damaged') then 1 else 0 end)`,
      // The id check is essential: this is a LEFT JOIN, so a room with no
      // photos still produces a row whose item columns are all NULL — and a
      // NULL synced_at would otherwise be counted as an unsynced photo.
      unsynced: sql<number>`sum(case when ${inspectionItems.id} is not null and ${inspectionItems.syncedAt} is null then 1 else 0 end)`,
    })
    .from(inspectionRooms)
    .leftJoin(
      inspectionItems,
      and(
        eq(inspectionItems.roomId, inspectionRooms.id),
        isNull(inspectionItems.deletedAt)
      )
    )
    .where(
      and(
        eq(inspectionRooms.inspectionId, inspectionId),
        isNull(inspectionRooms.deletedAt)
      )
    )
    .groupBy(inspectionRooms.id)
    .orderBy(asc(inspectionRooms.orderIndex));

  return {
    rooms: rows,
    photos: rows.reduce((n, r) => n + Number(r.photoCount ?? 0), 0),
    issues: rows.reduce((n, r) => n + Number(r.damaged ?? 0), 0),
    unsynced: rows.reduce((n, r) => n + Number(r.unsynced ?? 0), 0),
    documented: rows.filter((r) => Number(r.photoCount ?? 0) > 0).length,
  };
}

/**
 * Seals the inspection. After this the server pins the signatures, the
 * completion time and the status, so nothing here can be revised later —
 * which is the point of a signed record.
 *
 * The landlord half is optional: a tenant frequently documents alone, and a
 * one-sided record is still far better evidence than none.
 */
export async function completeInspection(
  inspectionId: string,
  input: SignatureInput
) {
  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx
      .update(inspections)
      .set({
        status: "completed",
        completedAt: now,
        tenantSignature: input.tenantSignature,
        tenantSignerName: input.tenantSignerName.trim(),
        tenantSignedAt: now,
        landlordSignature: input.landlordSignature ?? null,
        landlordSignerName: input.landlordSignerName?.trim() ?? null,
        landlordSignedAt: input.landlordSignature ? now : null,
        updatedAt: now,
        syncedAt: null,
      })
      .where(eq(inspections.id, inspectionId));

    await enqueue(tx, {
      entity: "inspection",
      entityId: inspectionId,
      op: "update",
    });
  });
}

/** Rejects edits to a sealed inspection, wherever they come from. */
async function assertNotSealed(inspectionId: string) {
  const [row] = await db
    .select({ status: inspections.status })
    .from(inspections)
    .where(eq(inspections.id, inspectionId))
    .limit(1);
  if (row?.status === "completed") throw new InspectionSealedError();
}

export async function addRoom(inspectionId: string, roomName: string) {
  await assertNotSealed(inspectionId);

  const name = roomName.trim();
  if (!name) throw new Error("Enter a room name.");

  const existing = await db
    .select({ name: inspectionRooms.roomName, order: inspectionRooms.orderIndex })
    .from(inspectionRooms)
    .where(
      and(
        eq(inspectionRooms.inspectionId, inspectionId),
        isNull(inspectionRooms.deletedAt)
      )
    );

  if (existing.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`${name} is already on this inspection.`);
  }

  const now = Date.now();
  const room = {
    id: newId(),
    inspectionId,
    roomName: name,
    orderIndex: existing.reduce((max, r) => Math.max(max, r.order), -1) + 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncedAt: null,
  };

  await db.transaction(async (tx) => {
    await tx.insert(inspectionRooms).values(room);
    await enqueue(tx, { entity: "room", entityId: room.id, op: "insert" });
  });

  return room;
}

/**
 * Removes a room from the checklist.
 *
 * Only when empty. Deleting a room that holds photos would discard evidence as
 * a side effect of tidying a list, which is not a trade a tenant should be able
 * to make by accident.
 */
export async function deleteRoom(roomId: string) {
  const [room] = await db
    .select({ inspectionId: inspectionRooms.inspectionId })
    .from(inspectionRooms)
    .where(eq(inspectionRooms.id, roomId))
    .limit(1);
  if (!room) return;

  await assertNotSealed(room.inspectionId);

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(inspectionItems)
    .where(
      and(eq(inspectionItems.roomId, roomId), isNull(inspectionItems.deletedAt))
    );

  if (Number(n) > 0) {
    throw new Error(
      "This room has photos. Rooms holding evidence cannot be removed."
    );
  }

  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx
      .update(inspectionRooms)
      .set({ deletedAt: now, updatedAt: now, syncedAt: null })
      .where(eq(inspectionRooms.id, roomId));
    await enqueue(tx, { entity: "room", entityId: roomId, op: "delete" });
  });
}
