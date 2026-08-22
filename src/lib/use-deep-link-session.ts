import * as Linking from "expo-linking";
import { useEffect } from "react";

import { supabase } from "./supabase";

/**
 * Turns an incoming auth deep link into a session.
 *
 * `detectSessionInUrl` is off on native, so nothing consumes the `?code=` that
 * Supabase appends to recovery and confirmation links. This exchanges it for a
 * session, which in turn fires the auth state change the rest of the app
 * listens to.
 *
 * The code is bound to a verifier stored on this install, so a link opened on
 * a different device cannot be exchanged — that fails by design.
 */
export function useDeepLinkSession() {
  const url = Linking.useURL();

  useEffect(() => {
    if (!url) return;

    const { queryParams } = Linking.parse(url);
    const code = queryParams?.code;
    if (typeof code !== "string") return;

    supabase.auth.exchangeCodeForSession(code);
  }, [url]);
}
