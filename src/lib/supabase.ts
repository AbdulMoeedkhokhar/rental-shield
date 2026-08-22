// Must come first: installs crypto.subtle so PKCE uses S256, not plain.
import "./webcrypto-polyfill";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import aesjs from "aes-js";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill in your project credentials."
  );
}

// Fail loudly on the scaffolded values, otherwise every request dies as an
// opaque network error and looks like a connectivity bug.
if (supabaseUrl.includes("your-project-ref")) {
  throw new Error(
    "Supabase credentials in .env are still placeholders. Fill them in from " +
      "your project's Settings > API page."
  );
}

/**
 * A Supabase session is several KB, and SecureStore rejects values over ~2048
 * bytes. So we store an AES-256 key per session key in SecureStore (Keychain /
 * Keystore) and keep the encrypted payload in AsyncStorage, which is unbounded
 * but unencrypted. Neither half is useful on its own.
 *
 * This is the pattern Supabase documents for Expo.
 */
class LargeSecureStore {
  private async encrypt(key: string, value: string) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1)
    );
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(
      key,
      aesjs.utils.hex.fromBytes(encryptionKey)
    );
    return aesjs.utils.hex.fromBytes(encrypted);
  }

  private async decrypt(key: string, value: string) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    );
    const decrypted = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decrypted);
  }

  async getItem(key: string) {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this.decrypt(key, encrypted);
  }

  async setItem(key: string, value: string) {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string) {
    // Drop the key first: an orphaned ciphertext is inert, an orphaned key is a
    // secret we no longer need.
    await SecureStore.deleteItemAsync(key);
    await AsyncStorage.removeItem(key);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session handoff on native; we parse incoming links
    // ourselves in useDeepLinkSession().
    detectSessionInUrl: false,
    // PKCE puts a single-use `code` on the redirect instead of tokens in a URL
    // fragment, and ties it to a verifier held only by this install.
    flowType: "pkce",
  },
});

/**
 * Where Supabase should send the user after they click a recovery email.
 * `createURL` resolves to the app scheme in a build and to the dev-server URL
 * under Expo Go, so the same code works in both. Whatever this returns must be
 * on the project's Redirect URLs allowlist or Supabase drops it.
 */
export function resetRedirectUrl() {
  return Linking.createURL("/reset-password");
}
