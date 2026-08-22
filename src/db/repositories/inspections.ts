import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { enqueue } from "@/db/outbox";
import { inspectionRooms, inspections } from "@/db/schema";
import { ROOM_TEMPLATES } from "@/constants/checklist";
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
