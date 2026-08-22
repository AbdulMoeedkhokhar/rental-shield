import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { BrandFrame, BrandShield } from "@/components/ui/BrandMark";

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

export function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  // Animation Nodes
  const frameOpacity = useSharedValue(0);
  const frameScale = useSharedValue(1.75);

  const shockwaveScale = useSharedValue(0);
  const shockwaveOpacity = useSharedValue(0);

  const shieldScale = useSharedValue(0);
  const shieldOpacity = useSharedValue(0);

  const textTranslateY = useSharedValue(25);
  const textOpacity = useSharedValue(0);

  const badgeOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Viewfinder brackets converge, like a camera pulling focus.
    frameOpacity.value = withTiming(1, { duration: 200 });
    frameScale.value = withTiming(1, {
      duration: 620,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

    // 2. Shockwave Pulse on Impact (fires at t = 550ms)
    shockwaveScale.value = withDelay(
      520,
      withSequence(
        withTiming(2.4, { duration: 450, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 0 })
      )
    );
    shockwaveOpacity.value = withDelay(
      520,
      withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(0, { duration: 350 })
      )
    );

    // 3. Shield locks into the framed area once focus lands.
    shieldOpacity.value = withDelay(530, withTiming(1, { duration: 150 }));
    shieldScale.value = withDelay(
      530,
      withSpring(1, { damping: 10, stiffness: 140 })
    );

    // 4. Staggered Text Reveal
    textOpacity.value = withDelay(750, withTiming(1, { duration: 400 }));
    textTranslateY.value = withDelay(
      750,
      withSpring(0, { damping: 14, stiffness: 100 })
    );

    // 5. Bottom Cryptographic Badge
    badgeOpacity.value = withDelay(950, withTiming(1, { duration: 400 }));

    // Finish Splash
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: frameScale.value }],
    opacity: frameOpacity.value,
  }));

  const shockwaveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shockwaveScale.value }],
    opacity: shockwaveOpacity.value,
  }));

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shieldScale.value }],
    opacity: shieldOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textTranslateY.value }],
    opacity: textOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
  }));

  return (
    <View className="flex-1 bg-surface-dark items-center justify-center px-6">
      {/* Center Target & Impact Anchor */}
      <View className="items-center justify-center relative w-32 h-32 mb-10">
        {/* Shockwave Ring */}
        <Animated.View
          style={shockwaveStyle}
          className="absolute w-32 h-32 rounded-full border-2 border-brand-400 bg-brand-500/20"
        />

        {/* Converging Viewfinder */}
        <Animated.View style={[frameStyle, { position: "absolute" }]}>
          <BrandFrame size={128} />
        </Animated.View>

        {/* Locked Forensic Shield */}
        <Animated.View style={shieldStyle} className="absolute">
          <BrandShield size={92} />
        </Animated.View>
      </View>

      {/* Brand & Forensic Tagline */}
      <Animated.View style={textStyle} className="items-center">
        <Text className="text-3xl font-extrabold text-white tracking-tight">
          Rental<Text className="text-brand-500">Shield</Text>
        </Text>
        <Text className="text-xs uppercase tracking-widest text-slate-400 mt-2 font-semibold">
          Forensic Inspection Protocol
        </Text>
      </Animated.View>

      {/* Status Badge */}
<Animated.View
  style={badgeStyle}
  className="absolute bottom-12 flex-row items-center space-x-2 bg-surface-card border border-slate-800 px-4 py-2 rounded-full"
>
  <View className="w-2 h-2 rounded-full bg-brand-500 mr-2" />
  <Text className="text-xs text-slate-400 font-medium">
    Security Verification Active
  </Text>
</Animated.View>
    </View>
  );
}