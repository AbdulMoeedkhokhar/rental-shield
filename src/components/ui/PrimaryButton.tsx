import type { ReactNode } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

import { colors } from "@/constants/colors";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = "primary",
}: PrimaryButtonProps) {
  const isPrimary = variant === "primary";
  const inactive = loading || disabled;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      className={`w-full py-4 rounded-xl flex-row items-center justify-center ${
        isPrimary
          ? "bg-brand-500 shadow-lg shadow-brand-500/20"
          : "bg-surface-card border border-slate-800"
      } ${inactive ? "opacity-60" : ""}`}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? colors.surface.dark : colors.ink.subtle}
        />
      ) : (
        <>
          <Text
            className={`font-bold text-base ${
              isPrimary ? "text-surface-dark" : "text-slate-200"
            } ${icon ? "mr-2" : ""}`}
          >
            {label}
          </Text>
          {icon}
        </>
      )}
    </TouchableOpacity>
  );
}
