import React, { useState } from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Shield, ArrowRight, CheckCircle2 } from "lucide-react-native";
import { AnimatedSplash } from "../components/ui/AnimatedSplash";

export default function IndexScreen() {
  const router = useRouter();
  const [isSplashing, setIsSplashing] = useState(true);

  if (isSplashing) {
    return <AnimatedSplash onAnimationComplete={() => setIsSplashing(false)} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-dark justify-between px-6 py-10">
      <StatusBar barStyle="light-content" />

      {/* Top Header / Brand */}
      <View className="items-center mt-6">
        <View className="w-16 h-16 rounded-2xl bg-surface-card border border-brand-500/30 items-center justify-center mb-4">
          <Shield size={32} color="#10B981" />
        </View>
        <Text className="text-3xl font-extrabold text-white tracking-tight text-center">
          Rental<Text className="text-brand-500">Shield</Text>
        </Text>
        <Text className="text-slate-400 text-sm text-center mt-2 px-4">
          Defend your security deposit with photo-verified property condition reports.
        </Text>
      </View>

      {/* Value Proposition */}
      <View className="space-y-3 my-auto">
        <View className="bg-surface-card border border-slate-800/80 p-4 rounded-xl flex-row items-center space-x-3">
          <View className="w-10 h-10 rounded-lg bg-brand-500/10 items-center justify-center mr-3">
            <CheckCircle2 size={20} color="#10B981" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-sm">Deposit Protection</Text>
            <Text className="text-slate-400 text-xs mt-0.5">Time-stamped photos and AI defect inspection</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="space-y-3 w-full">
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          activeOpacity={0.8}
          className="w-full bg-brand-500 py-4 rounded-xl flex-row items-center justify-center space-x-2"
        >
          <Text className="text-surface-dark font-bold text-base">Get Started</Text>
          <ArrowRight size={18} color="#090D0E" strokeWidth={2.5} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.7}
          className="w-full bg-surface-card border border-slate-800 py-4 rounded-xl items-center mt-3"
        >
          <Text className="text-slate-200 font-semibold text-base">Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}