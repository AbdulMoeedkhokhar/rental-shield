import { eq } from "drizzle-orm";
import { File } from "expo-file-system";

import { db } from "@/db/client";
import { markFailed, markSucceeded, pending } from "@/db/outbox";
import {
  inspectionItems,
  inspectionRooms,
  inspections,
  outbox,
  properties,
} from "@/db/schema";
import { toMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

import {
  inspectionToRemote,
  itemToRemote,
  propertyToRemote,
  roomToRemote,
} from "./mappers";

const BUCKET = "inspection-photos";

/**
 * After this many failures a row stops blocking the queue. It is parked, not
 * dropped — the payload stays in the table for inspection, because silently
 * discarding a user's evidence is worse than a stuck queue.
 */
const MAX_ATTEMPTS = 8;
const PARK_FOR_MS = 24 * 60 * 60 * 1000;

type OutboxRow = typeof outbox.$inferSelect;

async function loadLocal(entity: string, id: string) {
  const table =
    entity === "property"
      ? properties
      : entity === "inspection"
        ? inspections
        : entity === "room"
          ? inspectionRooms
          : inspectionItems;

  const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  return row;
}

/**
 * Uploads the photo, then records where it landed. Path is prefixed with the
 * owner's id because the storage policy checks the first path segment against
 * auth.uid() — the layout is the authorization.
 */
async function pushBlob(row: OutboxRow, userId: string) {
  const item = (await loadLocal("item", row.entityId)) as
    | typeof inspectionItems.$inferSelect
    | undefined;
  if (!item) return; // Deleted before it ever synced; nothing to upload.
  // No local file means this row came down from the server — the blob is
  // already there, so there is nothing to send back.
  if (!item.localUri) return;

  const file = new File(item.localUri);
  if (!file.exists) throw new Error(`Missing local file for ${item.id}`);

  const path = `${userId}/${item.id}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: "image/jpeg",
      // Re-running after a partial failure must not fail on "already exists".
      upsert: true,
    });
  if (error) throw error;

  // The thumbnail goes up too. It is a few KB against the original's few MB,
  // and it is what makes a restore on a new install show anything at all
  // without pulling every full-resolution photo down first.
  let thumbnailPath: string | null = null;
  if (item.thumbnailUri) {
    const thumbnail = new File(item.thumbnailUri);
    if (thumbnail.exists) {
      thumbnailPath = `${userId}/${item.id}_thumb.jpg`;
      const { error: thumbError } = await supabase.storage
        .from(BUCKET)
        .upload(thumbnailPath, await thumbnail.arrayBuffer(), {
          contentType: "image/jpeg",
          upsert: true,
        });
      // A missing thumbnail is recoverable — it regenerates from the original
      // — so it must never block the evidence itself from syncing.
      if (thumbError) thumbnailPath = null;
    }
  }

  await db
    .update(inspectionItems)
    .set({ remoteUrl: path, thumbnailUrl: thumbnailPath })
    .where(eq(inspectionItems.id, item.id));

  // The row was pushed before the blob existed, so restate it with the path.
  const updated = await loadLocal("item", item.id);
  if (updated) {
    const { error: rowError } = await supabase
      .from("inspection_items")
      .upsert(itemToRemote(updated as typeof inspectionItems.$inferSelect));
    if (rowError) throw rowError;
  }
}

async function pushRow(row: OutboxRow, userId: string) {
  const local = await loadLocal(row.entity, row.entityId);
  if (!local) return; // Hard-deleted locally; nothing to say about it.

  // Upsert rather than insert/update: the client owns the id, so replaying a
  // mutation that already landed is a no-op instead of a duplicate-key error.
  // Each branch calls upsert separately — sharing one call would widen the
  // payload type to the union and lose per-table checking.
  let error;
  switch (row.entity) {
    case "property":
      ({ error } = await supabase
        .from("properties")
        .upsert(propertyToRemote(local as typeof properties.$inferSelect)));
      break;
    case "inspection":
      ({ error } = await supabase
        .from("inspections")
        .upsert(inspectionToRemote(local as typeof inspections.$inferSelect)));
      break;
    case "room":
      ({ error } = await supabase
        .from("inspection_rooms")
        .upsert(
          roomToRemote(local as typeof inspectionRooms.$inferSelect, userId)
        ));
      break;
    default:
      ({ error } = await supabase
        .from("inspection_items")
        .upsert(itemToRemote(local as typeof inspectionItems.$inferSelect)));
  }
  if (error) throw error;

  const localTable =
    row.entity === "property"
      ? properties
      : row.entity === "inspection"
        ? inspections
        : row.entity === "room"
          ? inspectionRooms
          : inspectionItems;

  await db
    .update(localTable)
    .set({ syncedAt: Date.now() })
    .where(eq(localTable.id, row.entityId));
}

/**
 * Drains the queue in insertion order.
 *
 * Order is load-bearing: an item references a room that must exist remotely
 * first. So a failure stops the pass rather than skipping ahead — the next run
 * retries from the same point once backoff elapses.
 */
export async function pushOutbox(userId: string) {
  let pushed = 0;

  for (const row of await pending()) {
    try {
      if (row.op === "upload") await pushBlob(row, userId);
      else await pushRow(row, userId);
      await markSucceeded(row.id);
      pushed++;
    } catch (e) {
      const message = toMessage(e);
      // Raw object too: PostgREST puts the actionable part in details/hint.
      console.warn(`[sync] ${row.entity}/${row.op} failed`, e);

      if (row.attempts + 1 >= MAX_ATTEMPTS) {
        // Park it so one bad row cannot block every later mutation forever.
        await db
          .update(outbox)
          .set({
            attempts: row.attempts + 1,
            lastError: message.slice(0, 500),
            availableAt: Date.now() + PARK_FOR_MS,
          })
          .where(eq(outbox.id, row.id));
        continue;
      }

      await markFailed(row.id, row.attempts, message);
      return { pushed, stoppedOn: row.entity, error: message };
    }
  }

  return { pushed };
}
