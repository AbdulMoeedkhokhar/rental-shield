import "@/lib/webcrypto-polyfill";

/**
 * UUIDv7 — a 48-bit millisecond timestamp followed by randomness.
 *
 * Offline-first requires the client to mint ids: a photo has to reference its
 * room the moment it is captured, long before any server is reachable, so a
 * server-side `gen_random_uuid()` default cannot be the source. v7 over v4
 * because the leading timestamp keeps ids monotonic, which means index locality
 * on both SQLite and Postgres instead of random B-tree insertion.
 */
export function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const timestamp = Date.now();

  // 48-bit big-endian timestamp across bytes 0-5.
  bytes[0] = (timestamp / 0x10000000000) & 0xff;
  bytes[1] = (timestamp / 0x100000000) & 0xff;
  bytes[2] = (timestamp / 0x1000000) & 0xff;
  bytes[3] = (timestamp / 0x10000) & 0xff;
  bytes[4] = (timestamp / 0x100) & 0xff;
  bytes[5] = timestamp & 0xff;

  // Version 7 in the high nibble of byte 6, RFC 4122 variant in byte 8.
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
