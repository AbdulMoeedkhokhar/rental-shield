import { and, asc, lte, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { outbox } from "@/db/schema";

type Entity = "property" | "inspection" | "room" | "item" | "blob";
type Op = "insert" | "update" | "delete" | "upload";

/**
 * Appends a mutation to the queue. Callers must do this inside the same
 * transaction as the local write — a crash between the two would leave a row
 * that never reaches the server.
 */
export function enqueue(
  tx: { insert: typeof db.insert },
  entry: { entity: Entity; entityId: string; op: Op; payload?: unknown }
) {
  return tx.insert(outbox).values({
    entity: entry.entity,
    entityId: entry.entityId,
    op: entry.op,
    payload: entry.payload ?? null,
    createdAt: Date.now(),
    availableAt: 0,
  });
}

/** Next batch of mutations whose backoff window has elapsed, in order. */
export async function pending(limit = 50) {
  return db
    .select()
    .from(outbox)
    .where(lte(outbox.availableAt, Date.now()))
    .orderBy(asc(outbox.id))
    .limit(limit);
}

export async function markSucceeded(id: number) {
  await db.delete(outbox).where(sql`${outbox.id} = ${id}`);
}

/** Exponential backoff, capped, so a poisoned row cannot spin the drainer. */
export async function markFailed(id: number, attempts: number, error: string) {
  const delay = Math.min(2 ** attempts * 1000, 5 * 60 * 1000);
  await db
    .update(outbox)
    .set({
      attempts: attempts + 1,
      lastError: error.slice(0, 500),
      availableAt: Date.now() + delay,
    })
    .where(and(sql`${outbox.id} = ${id}`));
}
