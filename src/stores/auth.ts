import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

import { resetRedirectUrl, supabase } from "@/lib/supabase";

/**
 * Supabase's own error strings leak implementation detail ("Invalid login
 * credentials" is fine, "AuthApiError" is not), so map the ones users actually
 * hit and pass anything else through.
 */
function humanize(message: string) {
  if (/invalid login credentials/i.test(message))
    return "That email and password don't match.";
  if (/email not confirmed/i.test(message))
    return "Confirm your email address before signing in.";
  if (/user already registered/i.test(message))
    return "An account with that email already exists.";
  // Supabase's built-in mailer allows 2 emails per hour across the whole
  // project — signup confirmations and password resets share one budget.
  if (/rate limit/i.test(message))
    return "Email limit reached for this project. Supabase's built-in mailer allows 2 per hour. Try again later, or configure custom SMTP.";
  if (/network|fetch/i.test(message))
    return "Can't reach the server. Check your connection.";
  return message;
}

/**
 * `already-registered` is not an error path. With email confirmation on,
 * Supabase deliberately does not reveal that an address is taken — it returns
 * a success-shaped response so an attacker cannot enumerate accounts. We
 * detect it only to give the real owner a useful next step.
 */
export type SignUpOutcome =
  | "signed-in"
  | "needs-confirmation"
  | "already-registered";

type AuthState = {
  session: Session | null;
  user: User | null;
  /** True until the persisted session has been read back from storage. */
  initializing: boolean;
  /**
   * A recovery link put us in a session that exists only to set a new
   * password. The layouts use this to hold the user on the reset screen
   * instead of letting a half-authenticated session into the app.
   */
  recovery: boolean;
  /** Subscribes to auth changes. Returns an unsubscribe fn. */
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<SignUpOutcome>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initializing: true,
  recovery: false,

  init: () => {
    // Restoring the session decrypts and hits the Keychain, so it is async and
    // the UI must wait on `initializing` rather than assume signed-out.
    supabase.auth.getSession().then(({ data }) => {
      set({
        session: data.session,
        user: data.session?.user ?? null,
        initializing: false,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      set({
        session,
        user: session?.user ?? null,
        initializing: false,
        // Latch on PASSWORD_RECOVERY; cleared by updatePassword or sign-out.
        ...(event === "PASSWORD_RECOVERY" ? { recovery: true } : {}),
        ...(event === "SIGNED_OUT" ? { recovery: false } : {}),
      });
    });

    return () => subscription.unsubscribe();
  },

  // These don't set state themselves — onAuthStateChange is the single writer,
  // so there is no window where the store and Supabase disagree.
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(humanize(error.message));
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) throw new Error(humanize(error.message));

    // The obfuscated response for an existing address carries an empty
    // identities array. Checked with Array.isArray so a missing field is never
    // mistaken for a duplicate.
    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return "already-registered";
    }

    // No session means the project requires email confirmation first.
    return data.session ? "signed-in" : "needs-confirmation";
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(humanize(error.message));
  },

  requestPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: resetRedirectUrl(),
    });
    if (error) throw new Error(humanize(error.message));
  },

  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(humanize(error.message));
    // The session is now a normal one, so release the reset screen.
    set({ recovery: false });
  },
}));
