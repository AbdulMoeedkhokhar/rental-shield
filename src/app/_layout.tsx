import "../global.css"; // Adjust relative path to where your global.css is located
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AnimatedSplash } from "../components/ui/AnimatedSplash";
import { useDeepLinkSession } from "../lib/use-deep-link-session";
import { useAuthStore } from "../stores/auth";

// Hold the native splash until AnimatedSplash has painted, so the two hand off
// as one continuous screen instead of playing back to back.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 300 });

export default function RootLayout() {
  const [animationDone, setAnimationDone] = useState(false);
  const initializing = useAuthStore((s) => s.initializing);
  const init = useAuthStore((s) => s.init);

  // Restoring the session runs behind the splash, so the animation doubles as
  // the loading window and the user never sees a signed-out flash.
  useEffect(() => init(), [init]);

  // Turns a recovery/confirmation link into a session.
  useDeepLinkSession();

  // Once the animated splash has laid out there is real content behind the
  // native splash, so it is safe to drop.
  const handleSplashLayout = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  const showSplash = !animationDone || initializing;

  return (
    <View className="flex-1 bg-surface-dark">
      <Stack screenOptions={{ headerShown: false }} />
      {showSplash && (
        <View style={StyleSheet.absoluteFill} onLayout={handleSplashLayout}>
          <AnimatedSplash onAnimationComplete={() => setAnimationDone(true)} />
        </View>
      )}
    </View>
  );
}
