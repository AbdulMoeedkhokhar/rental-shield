import { useCallback, useEffect, useState } from "react";

import { getUsage } from "@/db/quota";
import { FREE_LIMITS } from "@/lib/entitlement";
import { useAuthStore } from "@/stores/auth";

type Entitlement = Awaited<ReturnType<typeof getUsage>>;

const EMPTY: Entitlement = {
  isPro: false,
  properties: 0,
  photos: 0,
  limits: FREE_LIMITS,
};

/**
 * The single boundary for "what is this user allowed to do".
 *
 * Screens read this to decide what to show; they never check `is_pro` inline.
 * Enforcement still happens in the data layer — this is for UI only, because a
 * client-side check is UX, never a control.
 */
export function useEntitlement() {
  const userId = useAuthStore((s) => s.user?.id);
  const [usage, setUsage] = useState<Entitlement>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setUsage(EMPTY);
      setLoading(false);
      return;
    }
    setUsage(await getUsage(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...usage,
    loading,
    refresh,
    canAddProperty: usage.isPro || usage.properties < FREE_LIMITS.properties,
    canAddPhoto: usage.isPro || usage.photos < FREE_LIMITS.photos,
    photosRemaining: usage.isPro
      ? Infinity
      : Math.max(0, FREE_LIMITS.photos - usage.photos),
  };
}
