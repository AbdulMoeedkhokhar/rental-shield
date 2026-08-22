import { File } from "expo-file-system";
import { useEffect, useState } from "react";

import type { inspectionItems } from "@/db/schema";
import { getSignedUrl } from "@/sync/media";

type Item = typeof inspectionItems.$inferSelect;

/**
 * Best available image for an item, preferring on-device files.
 *
 * Local first because it works offline and costs nothing. Falling back to a
 * signed URL means a restored account shows its evidence immediately instead
 * of waiting for every file to download — expo-image caches the fetch, so the
 * second render is free.
 *
 * Thumbnail before original in both tiers: older rows synced before thumbnail
 * upload existed have only the full-size object.
 */
export function useItemImage(item: Item): string | null {
  const localCandidate = item.thumbnailUri ?? item.localUri;
  const localUri =
    localCandidate && new File(localCandidate).exists ? localCandidate : null;

  const [signed, setSigned] = useState<string | null>(null);

  useEffect(() => {
    if (localUri) return;

    const path = item.thumbnailUrl ?? item.remoteUrl;
    if (!path) return;

    let cancelled = false;
    getSignedUrl(path).then((url) => {
      if (!cancelled) setSigned(url);
    });
    return () => {
      cancelled = true;
    };
  }, [localUri, item.thumbnailUrl, item.remoteUrl]);

  return localUri ?? signed;
}
