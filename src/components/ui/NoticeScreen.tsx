import type { ReactNode } from "react";
import { StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "./PrimaryButton";

type NoticeScreenProps = {
  icon: ReactNode;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

/** Terminal confirmation state — "check your email" and friends. */
export function NoticeScreen({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: NoticeScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-surface-dark px-6 justify-center items-center">
      <StatusBar barStyle="light-content" />
      <View className="w-16 h-16 rounded-2xl bg-surface-card border border-brand-500/40 items-center justify-center mb-5">
        {icon}
      </View>
      <Text className="text-2xl font-extrabold text-white text-center">
        {title}
      </Text>
      <Text className="text-slate-400 text-sm text-center mt-2">{message}</Text>
      <View className="w-full mt-8">
        <PrimaryButton label={actionLabel} onPress={onAction} />
      </View>
    </SafeAreaView>
  );
}
