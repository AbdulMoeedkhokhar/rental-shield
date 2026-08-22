// Dev utility: set a user's password without sending an email.
//
// Uses the Admin API, so the password goes through Supabase's own hashing and
// policy checks — unlike a direct UPDATE on auth.users.
//
// The service_role key bypasses RLS entirely. Pass it inline so it never
// lands in a file, and never give it the EXPO_PUBLIC_ prefix (that would
// inline it into the app bundle):
//
//   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/set-password.mjs user@mail.com 'NewPass123'
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("usage: node scripts/set-password.mjs <email> <new-password>");
  process.exit(1);
}

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY (Settings > API > service_role)");
  process.exit(1);
}

// Reuse the project URL already in .env; only the key is secret.
const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  readFileSync(".env", "utf8").match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();

if (!url) {
  console.error("No EXPO_PUBLIC_SUPABASE_URL found in env or .env");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error: listError } = await admin.auth.admin.listUsers({
  perPage: 1000,
});
if (listError) {
  console.error("Could not list users:", listError.message);
  process.exit(1);
}

const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No user with email ${email}`);
  process.exit(1);
}

const { error } = await admin.auth.admin.updateUserById(user.id, {
  password,
  email_confirm: true, // also clears an unconfirmed account in one shot
});
if (error) {
  console.error("Update failed:", error.message);
  process.exit(1);
}

console.log(`Password updated for ${email} (${user.id}), email marked confirmed`);
