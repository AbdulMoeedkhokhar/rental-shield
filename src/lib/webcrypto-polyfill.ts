import * as Crypto from "expo-crypto";

/**
 * Minimal WebCrypto surface, backed entirely by expo-crypto.
 *
 * Two things need it. supabase-js builds its PKCE code challenge with
 * `crypto.subtle.digest` and `TextEncoder`; React Native ships neither, and
 * auth-js does not fail on that — it warns and silently falls back to the
 * `plain` challenge method, which sends the verifier unhashed. And lib/ids.ts
 * needs `crypto.getRandomValues` for UUIDv7.
 *
 * expo-crypto rather than react-native-get-random-values because expo-crypto
 * is an SDK module, which keeps the app runnable in Expo Go.
 *
 * Must be imported before the Supabase client is constructed.
 */
const globals = globalThis as Record<string, any>;

function defineOnCrypto(key: string, value: unknown) {
  if (typeof globals.crypto === "undefined") globals.crypto = {};
  if (typeof globals.crypto[key] !== "undefined") return;
  try {
    Object.defineProperty(globals.crypto, key, { value, configurable: true });
  } catch {
    // Some runtimes freeze the crypto object; replace it wholesale instead.
    globals.crypto = { ...globals.crypto, [key]: value };
  }
}

defineOnCrypto("getRandomValues", <T extends ArrayBufferView>(array: T): T =>
  Crypto.getRandomValues(array as never) as unknown as T
);

if (typeof globals.TextEncoder === "undefined") {
  globals.TextEncoder = class TextEncoderPolyfill {
    readonly encoding = "utf-8";

    encode(input = ""): Uint8Array {
      const bytes: number[] = [];
      for (let i = 0; i < input.length; i++) {
        let code = input.charCodeAt(i);

        // Recombine surrogate pairs into a single code point.
        if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
          const next = input.charCodeAt(i + 1);
          if (next >= 0xdc00 && next <= 0xdfff) {
            code = (code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
            i++;
          }
        }

        if (code < 0x80) {
          bytes.push(code);
        } else if (code < 0x800) {
          bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code < 0x10000) {
          bytes.push(
            0xe0 | (code >> 12),
            0x80 | ((code >> 6) & 0x3f),
            0x80 | (code & 0x3f)
          );
        } else {
          bytes.push(
            0xf0 | (code >> 18),
            0x80 | ((code >> 12) & 0x3f),
            0x80 | ((code >> 6) & 0x3f),
            0x80 | (code & 0x3f)
          );
        }
      }
      return new Uint8Array(bytes);
    }
  };
}

if (typeof globals.btoa === "undefined") {
  const CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  globals.btoa = (input: string): string => {
    let out = "";
    for (let i = 0; i < input.length; i += 3) {
      const a = input.charCodeAt(i);
      const b = input.charCodeAt(i + 1);
      const c = input.charCodeAt(i + 2);
      const triple = (a << 16) | ((isNaN(b) ? 0 : b) << 8) | (isNaN(c) ? 0 : c);
      out +=
        CHARS[(triple >> 18) & 0x3f] +
        CHARS[(triple >> 12) & 0x3f] +
        (isNaN(b) ? "=" : CHARS[(triple >> 6) & 0x3f]) +
        (isNaN(c) ? "=" : CHARS[triple & 0x3f]);
    }
    return out;
  };
}

defineOnCrypto("subtle", {
  digest: (
    algorithm: string | { name: string },
    data: BufferSource
  ): Promise<ArrayBuffer> => {
    const name = typeof algorithm === "string" ? algorithm : algorithm.name;
    // Native only accepts a real TypedArray; an ArrayBuffer throws.
    const bytes =
      data instanceof Uint8Array
        ? data
        : new Uint8Array(
            ArrayBuffer.isView(data) ? data.buffer : (data as ArrayBuffer)
          );
    return Crypto.digest(name as Crypto.CryptoDigestAlgorithm, bytes);
  },
});
