import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { userState } from "@/db/schema";

/** Creates the row on first use so callers never handle a missing record. */
export async function ensureUserState(userId: string) {
  const existing = await db
    .select()
    .from(userState)
    .where(eq(userState.userId, userId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const row = {
    userId,
    isPro: false,
    serverPropertyCount: 0,
    serverPhotoCount: 0,
    entitlementCheckedAt: null,
    syncCursor: null,
    updatedAt: Date.now(),
  };
  await db.insert(userState).values(row).onConflictDoNothing();
  return row;
}

/**
 * Caches the entitlement decided elsewhere. RevenueCat is the source of truth
 * and the server writes `profiles.is_pro`; this is only a local mirror so the
 * app can answer the question offline.
 */
export async function cacheEntitlement(userId: string, isPro: boolean) {
  await ensureUserState(userId);
  await db
    .update(userState)
    .set({ isPro, entitlementCheckedAt: Date.now(), updatedAt: Date.now() })
    .where(eq(userState.userId, userId));
}

/**
 * Server-side counts, refreshed on sync. Kept separate from local counts
 * because a local COUNT(*) resets when the app is reinstalled, which would
 * hand out a fresh free tier on every delete-and-reinstall.
 */
export async function reconcileServerCounts(
  userId: string,
  counts: { properties: number; photos: number }
) {
  await ensureUserState(userId);
  await db
    .update(userState)
    .set({
      serverPropertyCount: counts.properties,
      serverPhotoCount: counts.photos,
      updatedAt: Date.now(),
    })
    .where(eq(userState.userId, userId));
}
