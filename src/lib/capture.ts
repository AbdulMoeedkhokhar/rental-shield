import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Location from "expo-location";

/**
 * The forensic capture pipeline.
 *
 * Ordering is the whole point: the raw frame is hashed BEFORE any resize,
 * re-encode, or thumbnail. A digest taken after downsampling would attest to a
 * derived image, not the one the camera produced, and would not match what an
 * independent verifier computes from the file.
 */

const PHOTO_DIR = "inspection-photos";
const THUMBNAIL_WIDTH = 480;

export type ForensicCapture = {
  localUri: string;
  thumbnailUri: string;
  /** Lowercase hex SHA-256 of the original file bytes. */
  imageHash: string;
  capturedAt: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  heading?: number;
};

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * expo-crypto's types accept `BufferSource`, but the native side only casts a
 * real TypedArray — a bare ArrayBuffer throws NotTypedArrayException at the
 * bridge. Wrapping is required, not defensive.
 */
async function sha256(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return toHex(digest);
}

/**
 * Photos live in the document directory, not the cache the camera writes to —
 * the OS evicts cache under storage pressure, and evidence that can vanish is
 * not evidence.
 */
function photoDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/**
 * Best-effort sensor metadata. Never allowed to fail a capture: a tenant in a
 * basement with no GPS lock still needs the photo, just with weaker provenance.
 */
async function readSensors() {
  const result: Pick<
    ForensicCapture,
    "latitude" | "longitude" | "altitude" | "heading"
  > = {};

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return result;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    result.latitude = position.coords.latitude;
    result.longitude = position.coords.longitude;
    result.altitude = position.coords.altitude ?? undefined;
  } catch {
    // No fix available; leave the fields undefined rather than guessing.
  }

  try {
    const heading = await Location.getHeadingAsync();
    result.heading = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
  } catch {
    // No magnetometer, or it is uncalibrated.
  }

  return result;
}

/**
 * Takes the camera's temporary file and turns it into a durable, hashed,
 * geotagged record. `capturedAt` is passed in from the shutter rather than
 * read here, so the timestamp reflects the exposure, not the processing.
 */
export async function processCapture(
  sourceUri: string,
  capturedAt: number
): Promise<ForensicCapture> {
  const source = new File(sourceUri);

  // 1. Hash the untouched bytes. Nothing above this line may modify the file.
  const imageHash = await sha256(source);

  // 2. Move out of the evictable cache, named by its own digest so the file
  //    name is itself a checksum and duplicate captures collapse.
  const directory = photoDirectory();
  const destination = new File(directory, `${imageHash}.jpg`);
  if (!destination.exists) {
    await source.move(destination);
  }

  // 3. Derive the thumbnail only now, from the persisted original.
  const context = ImageManipulator.manipulate(destination.uri);
  context.resize({ width: THUMBNAIL_WIDTH });
  const rendered = await context.renderAsync();
  const thumbnail = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.6,
  });

  // saveAsync writes to the cache directory, which the OS evicts. Move it
  // beside the original so the grid does not silently fall back to decoding
  // full-resolution images.
  const thumbnailFile = new File(thumbnail.uri);
  const thumbnailDestination = new File(directory, `${imageHash}_thumb.jpg`);
  if (thumbnailDestination.exists) thumbnailDestination.delete();
  await thumbnailFile.move(thumbnailDestination);

  const sensors = await readSensors();

  return {
    localUri: destination.uri,
    thumbnailUri: thumbnailDestination.uri,
    imageHash,
    capturedAt,
    ...sensors,
  };
}

/**
 * Recomputes the digest of a stored photo and compares it to the recorded one.
 * Backs the verification terminal in the plan's diagnostics panel, and is the
 * check a third party would run to confirm a report was not altered.
 */
export async function verifyIntegrity(localUri: string, expectedHash: string) {
  const file = new File(localUri);
  if (!file.exists) return { valid: false, reason: "file-missing" as const };

  const actual = await sha256(file);
  return actual === expectedHash
    ? { valid: true as const, hash: actual }
    : { valid: false as const, reason: "hash-mismatch" as const, hash: actual };
}
