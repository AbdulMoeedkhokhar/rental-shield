import { Asset, requestPermissionsAsync } from "expo-media-library";

import type { inspectionItems } from "@/db/schema";
import { ensureOriginal } from "@/sync/media";

type Item = typeof inspectionItems.$inferSelect;

/**
 * Saves a copy of the full-resolution original to the camera roll.
 *
 * Deliberately the original and not the thumbnail: a downsampled copy would
 * hash differently from the record, so anyone checking it against the report
 * would get a mismatch and conclude the evidence was altered.
 *
 * The exported copy carries no provenance — that is inherent to the camera
 * roll, and the reason the UI calls this "save a copy" rather than "export
 * report". The sealed PDF remains the artifact that proves anything.
 */
export async function saveCopyToLibrary(item: Item): Promise<void> {
  // writeOnly: we only ever add. Asking for read access to someone's entire
  // photo library to save one file would be an unreasonable prompt.
  const permission = await requestPermissionsAsync(true);
  if (!permission.granted) {
    throw new Error(
      "Photo library access was declined, so the copy could not be saved."
    );
  }

  // A restored install may never have held the original; fetch it first.
  const uri = await ensureOriginal(item);
  if (!uri) {
    throw new Error("The original photo is not available to copy.");
  }

  await Asset.create(uri);
}
