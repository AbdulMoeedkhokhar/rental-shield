import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-4">
      <View className="w-14 h-14 rounded-2xl bg-surface-card border border-slate-800 items-center justify-center mb-4">
        {icon}
      </View>
      <Text className="text-white font-bold text-base text-center">{title}</Text>
      <Text className="text-slate-400 text-sm text-center mt-1.5">{message}</Text>
    </View>
  );
}
