import { Text, View } from "react-native";

/** Submit-level error banner. Renders nothing when there is no message. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <View className="mt-5 bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3">
      <Text className="text-red-400 text-sm">{message}</Text>
    </View>
  );
}
