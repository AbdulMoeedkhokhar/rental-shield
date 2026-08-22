import * as Network from "expo-network";

import { reconcileServerCounts } from "@/db/repositories/user-state";
import { toMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

import { pullChanges } from "./pull";
import { pushOutbox } from "./push";

export type SyncResult =
  | { ran: false; reason: "offline" | "signed-out" | "already-running" }
  | { ran: true; pushed: number; pulled: number; error?: string };

// Module-level rather than per-caller: connectivity changes, app foreground,
// and a manual pull can all fire at once, and two concurrent drains would
// process the same outbox rows twice.
let running = false;

/**
 * Pulls the server's authoritative row counts back into local state.
 *
 * This is what closes the reinstall hole in the free tier: a local COUNT(*)
 * starts at zero on a fresh install, but the server remembers.
 */
async function reconcileQuota(userId: string) {
  const { data, error } = await supabase.rpc("usage_counts");
  if (error || !data) return;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return;

  await reconcileServerCounts(userId, {
    properties: Number(row.properties ?? 0),
    photos: Number(row.photos ?? 0),
  });
}

export async function runSync(userId: string | undefined): Promise<SyncResult> {
  if (!userId) return { ran: false, reason: "signed-out" };
  if (running) return { ran: false, reason: "already-running" };

  // isInternetReachable can be undefined on platforms that cannot determine
  // it; only a definite false means "do not bother trying".
  const state = await Network.getNetworkStateAsync();
  if (state.isConnected === false || state.isInternetReachable === false) {
    return { ran: false, reason: "offline" };
  }

  running = true;
  try {
    // Push first: local edits are the newer truth, and pushing before pulling
    // means the pull never overwrites a change that has not left the device.
    const result = await pushOutbox(userId);

    let pulled = 0;
    let error = result.error;
    try {
      // Page until drained, bounded so a bad cursor cannot loop forever.
      for (let page = 0; page < 20; page++) {
        const chunk = await pullChanges(userId);
        pulled += chunk.pulled;
        if (!chunk.more) break;
      }
    } catch (e) {
      error = error ?? toMessage(e);
      console.warn("[sync] pull failed", e);
    }

    // Reconcile last so the counts include everything both directions moved.
    await reconcileQuota(userId);
    return { ran: true, pushed: result.pushed, pulled, error };
  } finally {
    running = false;
  }
}
