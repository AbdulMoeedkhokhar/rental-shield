import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "../../components/ui/BrandMark";
import { useAuthStore } from "../../stores/auth";

// Placeholder landing spot for an authenticated user. Replaced by the property
// list once the local data layer lands.
export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView className="flex-1 bg-surface-dark px-6 justify-between py-10">
      <View className="items-center mt-10">
        <BrandMark size={72} />
        <Text className="text-2xl font-extrabold text-white mt-4">
          You're signed in
        </Text>
        <Text className="text-slate-400 text-sm mt-2 text-center">
          {user?.email}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => signOut()}
        activeOpacity={0.8}
        className="w-full bg-surface-card border border-slate-800 py-4 rounded-xl items-center"
      >
        <Text className="text-slate-200 font-semibold text-base">Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
