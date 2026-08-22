import { Redirect, Stack } from "expo-router";

import { useSync } from "@/hooks/use-sync";
import { useAuthStore } from "@/stores/auth";

export default function AppLayout() {
  const session = useAuthStore((s) => s.session);
  const recovery = useAuthStore((s) => s.recovery);

  // Mounted once for the whole signed-in tree, so exactly one worker exists
  // no matter how many screens are stacked.
  useSync();

  // The root layout holds the splash until `initializing` clears, so a null
  // session here means genuinely signed out rather than not-yet-restored.
  if (!session) return <Redirect href="/" />;
  // Hold a recovery session on the reset screen rather than letting a
  // half-authenticated user into the app.
  if (recovery) return <Redirect href="/(auth)/reset-password" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
