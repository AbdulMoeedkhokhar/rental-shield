import { StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface-dark justify-center items-center px-6">
      <StatusBar barStyle="light-content" />
      <View className="bg-surface-card p-6 rounded-2xl border border-slate-700 w-full items-center">
        <Text className="text-2xl font-bold text-white mb-2">RentalShield</Text>
        <Text className="text-red-400 text-center text-sm">
          Forensic-grade move-in & move-out condition reporting
        </Text>
        <View className="mt-6 px-4 py-2 bg-brand-500 rounded-lg">
          <Text className="text-white font-semibold">Tailwind Working</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
