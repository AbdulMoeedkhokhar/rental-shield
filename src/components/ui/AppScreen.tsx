import type { ReactNode, RefObject } from "react";
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

import { colors } from "@/constants/colors";

type AppScreenProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Header-right slot. */
  action?: ReactNode;
  /** Fills the remaining space — put a FlatList here, not a ScrollView. */
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Wrap children in a scroll view. Prefer this over nesting your own: a
   * ScrollView inside a flex parent needs an explicit flex:1 or it sizes to
   * its content and clips instead of scrolling.
   */
  scroll?: boolean;
  /** Lets a screen scroll itself — e.g. to bring a validation error into view. */
  scrollRef?: RefObject<ScrollView | null>;
};

/**
 * Scaffold for signed-in screens. Deliberately does not own scrolling: lists
 * inside can be virtualised, which a wrapping ScrollView would prevent.
 */
export function AppScreen({
  title,
  subtitle,
  onBack,
  action,
  children,
  footer,
  scroll = false,
  scrollRef,
}: AppScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-surface-dark">
      <StatusBar barStyle="light-content" />
      <View className="px-6 pt-2 pb-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                className="w-10 h-10 rounded-xl bg-surface-card border border-slate-800 items-center justify-center mb-4"
              >
                <ArrowLeft size={20} color={colors.ink.subtle} />
              </TouchableOpacity>
            ) : null}
            <Text className="text-3xl font-extrabold text-white tracking-tight">
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-slate-400 text-sm mt-1">{subtitle}</Text>
            ) : null}
          </View>
          {action ? <View className="ml-3 mt-1">{action}</View> : null}
        </View>
      </View>

      {scroll ? (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          className="px-6"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 px-6">{children}</View>
      )}

      {footer ? <View className="px-6 pb-4 pt-2">{footer}</View> : null}
    </SafeAreaView>
  );
}
