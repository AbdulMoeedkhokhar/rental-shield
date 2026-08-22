import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { ensureUserState } from "@/db/repositories/user-state";
import { inspectionItems, properties } from "@/db/schema";
import { FREE_LIMITS, QuotaExceededError } from "@/lib/entitlement";

async function localCount(
  table: typeof properties | typeof inspectionItems,
  userId: string
) {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(table)
    .where(and(eq(table.userId, userId), isNull(table.deletedAt)));
  return row?.n ?? 0;
}

/**
 * Effective usage is max(local, server-reported).
 *
 * Local alone is resettable by reinstalling. Server alone is unavailable
 * offline and stale the moment something is created. Taking the larger of the
 * two is correct in both directions: it cannot under-count after a reinstall,
 * and it counts work done offline immediately.
 */
export async function getUsage(userId: string) {
  const state = await ensureUserState(userId);
  const [localProperties, localPhotos] = await Promise.all([
    localCount(properties, userId),
    localCount(inspectionItems, userId),
  ]);

  return {
    isPro: state.isPro,
    properties: Math.max(localProperties, state.serverPropertyCount),
    photos: Math.max(localPhotos, state.serverPhotoCount),
    limits: FREE_LIMITS,
  };
}

export async function assertCanCreateProperty(userId: string) {
  const usage = await getUsage(userId);
  if (usage.isPro) return;
  if (usage.properties >= FREE_LIMITS.properties) {
    throw new QuotaExceededError("properties", FREE_LIMITS.properties);
  }
}

export async function assertCanAddPhotos(userId: string, adding = 1) {
  const usage = await getUsage(userId);
  if (usage.isPro) return;
  if (usage.photos + adding > FREE_LIMITS.photos) {
    throw new QuotaExceededError("photos", FREE_LIMITS.photos);
  }
}
