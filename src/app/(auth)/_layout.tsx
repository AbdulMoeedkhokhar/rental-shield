import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@/stores/auth";

export default function AuthLayout() {
  const session = useAuthStore((s) => s.session);
  const recovery = useAuthStore((s) => s.recovery);

  // Already signed in — no reason to see login/signup again. A recovery
  // session is excluded: it exists only to set a new password.
  if (session && !recovery) return <Redirect href="/(app)/dashboard" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
