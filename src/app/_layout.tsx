import "../global.css"; // Adjust relative path to where your global.css is located
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AnimatedSplash } from "../components/ui/AnimatedSplash";

// Hold the native splash until AnimatedSplash has painted, so the two hand off
// as one continuous screen instead of playing back to back.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 400 });

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  // Once the animated splash has laid out there is real content behind the
  // native splash, so it is safe to drop.
  const handleSplashLayout = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View className="flex-1 bg-surface-dark">
      <Stack screenOptions={{ headerShown: false }} />
      {!splashDone && (
        <View style={StyleSheet.absoluteFill} onLayout={handleSplashLayout}>
          <AnimatedSplash onAnimationComplete={() => setSplashDone(true)} />
        </View>
      )}
    </View>
  );
}
