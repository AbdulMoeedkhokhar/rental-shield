import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

import { colors } from "@/constants/colors";

type AuthScreenProps = {
  title: string;
  subtitle?: string;
  /** Omit to hide the back control (e.g. a screen with nowhere to go back to). */
  onBack?: () => void;
  children: ReactNode;
  /** Pinned to the bottom: primary action plus any footer links. */
  footer: ReactNode;
};

/**
 * Shared scaffold for every auth screen.
 *
 * Beyond removing duplication, this is the one place that knows layout styles
 * must go on `contentContainerStyle` — putting `justify-*` or padding in a
 * ScrollView's className makes React Native throw at render. Screens built on
 * top of this cannot reintroduce that bug.
 */
export function AuthScreen({
  title,
  subtitle,
  onBack,
  children,
  footer,
}: AuthScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-surface-dark">
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingVertical: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                className="w-10 h-10 rounded-xl bg-surface-card border border-slate-800 items-center justify-center mb-6"
              >
                <ArrowLeft size={20} color={colors.ink.subtle} />
              </TouchableOpacity>
            ) : (
              <View className="mt-4" />
            )}

            <View className="mb-8">
              <Text className="text-3xl font-extrabold text-white tracking-tight">
                {title}
              </Text>
              {subtitle ? (
                <Text className="text-slate-400 text-sm mt-1">{subtitle}</Text>
              ) : null}
            </View>

            {children}
          </View>

          <View className="mt-8">{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
