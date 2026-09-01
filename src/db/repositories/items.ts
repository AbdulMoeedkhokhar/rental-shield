import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { enqueue } from "@/db/outbox";
import { assertCanAddPhotos } from "@/db/quota";
import { inspectionItems, inspectionRooms, inspections } from "@/db/schema";
import type { ConditionStatus } from "@/constants/checklist";
import { InspectionSealedError } from "@/lib/entitlement";
import { newId } from "@/lib/ids";

export type CapturedItem = {
  roomId: string;
  title: string;
  conditionStatus: ConditionStatus;
  description?: string;
  /** On-device file path. Present at capture; the remote URL is not. */
  localUri: string;
  thumbnailUri?: string;
  /** SHA-256 of the raw frame, computed before any downsampling. */
  imageHash: string;
  capturedAt: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  heading?: number;
};

export async function listItems(roomId: string) {
  return db
    .select()
    .from(inspectionItems)
    .where(
      and(eq(inspectionItems.roomId, roomId), isNull(inspectionItems.deletedAt))
    )
    .orderBy(asc(inspectionItems.capturedAt));
}

/**
 * Persists a capture. Two outbox entries: the row, and a separate blob upload,
 * because the image can only be uploaded once presigned storage is reachable
 * and must retry independently of the metadata.
 *
 * Throws QuotaExceededError past the free photo cap.
 */
export async function createItem(userId: string, input: CapturedItem) {
  // Sealed inspections are closed to new evidence. Checked here rather than in
  // the capture screen so every path — retry, import, deep link — is covered.
  const [parentStatus] = await db
    .select({ status: inspections.status })
    .from(inspectionRooms)
    .innerJoin(inspections, eq(inspections.id, inspectionRooms.inspectionId))
    .where(eq(inspectionRooms.id, input.roomId))
    .limit(1);
  if (parentStatus?.status === "completed") throw new InspectionSealedError();

  await assertCanAddPhotos(userId);

  const now = Date.now();
  const row = {
    id: newId(),
    userId,
    ...input,
    remoteUrl: null,
    thumbnailUrl: null,
    aiDamageDetected: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncedAt: null,
  };

  await db.transaction(async (tx) => {
    await tx.insert(inspectionItems).values(row);
    await enqueue(tx, { entity: "item", entityId: row.id, op: "insert" });
    await enqueue(tx, {
      entity: "blob",
      entityId: row.id,
      op: "upload",
      payload: { localUri: input.localUri, imageHash: input.imageHash },
    });

    // First photo moves the inspection out of draft. Done here rather than in
    // a screen so the status reflects whether evidence exists, not whether
    // some particular button was pressed.
    const [parent] = await tx
      .select({ id: inspections.id, status: inspections.status })
      .from(inspectionRooms)
      .innerJoin(inspections, eq(inspections.id, inspectionRooms.inspectionId))
      .where(eq(inspectionRooms.id, input.roomId))
      .limit(1);

    if (parent && parent.status === "draft") {
      await tx
        .update(inspections)
        .set({ status: "in_progress", updatedAt: now, syncedAt: null })
        .where(eq(inspections.id, parent.id));
      await enqueue(tx, {
        entity: "inspection",
        entityId: parent.id,
        op: "update",
      });
    }
  });

  return row;
}

export async function setCondition(
  id: string,
  conditionStatus: ConditionStatus,
  description?: string
) {
  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx
      .update(inspectionItems)
      .set({ conditionStatus, description, updatedAt: now, syncedAt: null })
      .where(eq(inspectionItems.id, id));
    await enqueue(tx, { entity: "item", entityId: id, op: "update" });
  });
}
