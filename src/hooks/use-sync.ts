import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";

import { runSync, type SyncResult } from "@/sync";
import { useAuthStore } from "@/stores/auth";

/**
 * Drives the sync worker from the three things that actually change its
 * outcome: signing in, regaining connectivity, and returning to the app.
 * Deliberately not a timer — polling on a schedule wakes the radio to
 * discover nothing has changed.
 */
export function useSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const [last, setLast] = useState<SyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Read inside callbacks so listeners registered once still see the current
  // user rather than closing over a stale value.
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await runSync(userIdRef.current);
      setLast(result);
      return result;
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    sync();

    const network = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) sync();
    });

    const app = AppState.addEventListener("change", (status) => {
      if (status === "active") sync();
    });

    return () => {
      network.remove();
      app.remove();
    };
  }, [userId, sync]);

  return { sync, syncing, last };
}
