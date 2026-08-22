import type { ReactNode } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

type AuthFieldProps = TextInputProps & {
  label: string;
  icon: ReactNode;
  error?: string;
  /** Rendered inside the field, after the input — e.g. a show/hide toggle. */
  trailing?: ReactNode;
};

export function AuthField({
  label,
  icon,
  error,
  trailing,
  ...inputProps
}: AuthFieldProps) {
  return (
    <View>
      <Text className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
        {label}
      </Text>
      <View
        className={`flex-row items-center bg-surface-card border rounded-xl px-4 py-3.5 ${
          error ? "border-red-500/70" : "border-slate-800"
        }`}
      >
        {icon}
        <TextInput
          placeholderTextColor="#475569"
          className="flex-1 text-white ml-3"
          // Deliberately not `text-base`: that also sets lineHeight, and an
          // explicit lineHeight on a TextInput clips descenders (g, j, p) on
          // iOS. Font size alone lets the input size itself correctly.
          style={{ fontSize: 16, paddingVertical: 0 }}
          {...inputProps}
        />
        {trailing}
      </View>
      {error ? (
        <Text className="text-red-400 text-xs mt-1.5">{error}</Text>
      ) : null}
    </View>
  );
}
