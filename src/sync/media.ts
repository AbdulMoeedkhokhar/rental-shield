import { eq } from "drizzle-orm";
import { Directory, File, Paths } from "expo-file-system";

import { db } from "@/db/client";
import { inspectionItems } from "@/db/schema";
import { supabase } from "@/lib/supabase";

const BUCKET = "inspection-photos";
const PHOTO_DIR = "inspection-photos";

function photoDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/**
 * Downloads one storage object to a local file and returns its uri.
 *
 * Deliberately not `supabase.storage.download()`: that resolves to a Blob, and
 * React Native's Blob implementation has no `arrayBuffer()` — the call fails
 * with "undefined is not a function". It would also copy the whole file into
 * the native blob store and back out through base64. Downloading from a signed
 * URL streams straight to disk instead, which matters for multi-megabyte
 * originals.
 */
async function download(storagePath: string, fileName: string) {
  const target = new File(photoDirectory(), fileName);
  if (target.exists) return target.uri;

  const url = await getSignedUrl(storagePath);
  if (!url) throw new Error(`Could not sign a URL for ${storagePath}`);

  const downloaded = await File.downloadFileAsync(url, target);
  return downloaded.uri;
}

type Item = typeof inspectionItems.$inferSelect;

/**
 * Restores the thumbnail for an item pulled from the server.
 *
 * Thumbnails only — a full restore of every original would mean tens of MB on
 * first launch. Originals come down on demand via ensureOriginal().
 */
export async function restoreThumbnail(item: Item) {
  if (item.thumbnailUri && new File(item.thumbnailUri).exists) return;
  if (!item.thumbnailUrl) return;

  const uri = await download(item.thumbnailUrl, `${item.imageHash}_thumb.jpg`);
  await db
    .update(inspectionItems)
    .set({ thumbnailUri: uri })
    .where(eq(inspectionItems.id, item.id));
}

/**
 * Guarantees the full-resolution original is on disk, fetching it if this
 * install has never held it. Needed before hashing for verification or
 * building a report.
 */
export async function ensureOriginal(item: Item): Promise<string | null> {
  if (item.localUri && new File(item.localUri).exists) return item.localUri;
  if (!item.remoteUrl) return null;

  const uri = await download(item.remoteUrl, `${item.imageHash}.jpg`);
  await db
    .update(inspectionItems)
    .set({ localUri: uri })
    .where(eq(inspectionItems.id, item.id));
  return uri;
}

/**
 * Signed URLs for display.
 *
 * The bucket is private, so there is no permanent URL — each one is minted on
 * demand and expires. Cached in memory because a scrolling grid would
 * otherwise mint one per tile per render.
 */
const signedUrls = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_TTL_SECONDS = 3600;

export async function getSignedUrl(path: string): Promise<string | null> {
  // Refresh a minute early so a URL cannot expire mid-render.
  const cached = signedUrls.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (error || !data) return null;

  signedUrls.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_TTL_SECONDS * 1000,
  });
  return data.signedUrl;
}
