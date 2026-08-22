import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { enqueue } from "@/db/outbox";
import { assertCanCreateProperty } from "@/db/quota";
import { properties } from "@/db/schema";
import { newId } from "@/lib/ids";

export type NewProperty = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  postalCode?: string;
  propertyType?: string;
  landlordName?: string;
  landlordEmail?: string;
};

export async function listProperties(userId: string) {
  return db
    .select()
    .from(properties)
    .where(and(eq(properties.userId, userId), isNull(properties.deletedAt)))
    .orderBy(desc(properties.createdAt));
}

/**
 * Throws QuotaExceededError when the free plan's single-property cap is hit.
 * The check lives here rather than in the screen so every creation path — UI,
 * import, deep link — is covered by one rule.
 */
export async function createProperty(userId: string, input: NewProperty) {
  await assertCanCreateProperty(userId);

  const now = Date.now();
  const row = {
    id: newId(),
    userId,
    propertyType: "Apartment",
    ...input,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncedAt: null,
  };

  // Row and outbox entry commit together, or neither does.
  await db.transaction(async (tx) => {
    await tx.insert(properties).values(row);
    await enqueue(tx, { entity: "property", entityId: row.id, op: "insert" });
  });

  return row;
}

/** Soft delete: a hard delete cannot be replayed to a server that never saw it. */
export async function deleteProperty(id: string) {
  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx
      .update(properties)
      .set({ deletedAt: now, updatedAt: now, syncedAt: null })
      .where(eq(properties.id, id));
    await enqueue(tx, { entity: "property", entityId: id, op: "delete" });
  });
}
