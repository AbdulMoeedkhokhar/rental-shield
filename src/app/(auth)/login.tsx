import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-surface-dark">
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-6 py-4 justify-between"
        >
          {/* Top Bar Navigation */}
          <View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-surface-card border border-slate-800 items-center justify-center mb-6"
            >
              <ArrowLeft size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Header */}
            <View className="mb-8">
              <View className="w-12 h-12 rounded-2xl bg-surface-card border border-brand-500/40 items-center justify-center mb-4">
                <Shield size={24} color="#10B981" />
              </View>
              <Text className="text-3xl font-extrabold text-white tracking-tight">
                Welcome Back
              </Text>
              <Text className="text-slate-400 text-sm mt-1">
  Sign in to access your rental condition reports.
</Text>
            </View>

            {/* Input Fields */}
            <View className="space-y-4">
              {/* Email Input */}
              <View>
                <Text className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Email Address
                </Text>
                <View className="flex-row items-center bg-surface-card border border-slate-800 rounded-xl px-4 py-3.5 focus:border-brand-500">
                  <Mail size={18} color="#64748B" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tenant@rentalshield.io"
                    placeholderTextColor="#475569"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="flex-1 text-white text-base ml-3"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mt-4">
                <Text className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Password
                </Text>
                <View className="flex-row items-center bg-surface-card border border-slate-800 rounded-xl px-4 py-3.5 focus:border-brand-500">
                  <Lock size={18} color="#64748B" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••••••"
                    placeholderTextColor="#475569"
                    secureTextEntry={!showPassword}
                    className="flex-1 text-white text-base ml-3"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={18} color="#64748B" />
                    ) : (
                      <Eye size={18} color="#64748B" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons & Footer */}
          <View className="mt-8 space-y-4">
            <TouchableOpacity
              activeOpacity={0.8}
              className="w-full bg-brand-500 py-4 rounded-xl flex-row items-center justify-center space-x-2 shadow-lg shadow-brand-500/20"
            >
              <Text className="text-surface-dark font-bold text-base">Authenticate</Text>
              <ArrowRight size={18} color="#090D0E" strokeWidth={2.5} />
            </TouchableOpacity>

            <View className="flex-row justify-center items-center mt-4">
  <Text className="text-slate-400 text-sm">Don't have an account? </Text>
  <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
    <Text className="text-brand-400 font-semibold text-sm">Create Account</Text>
  </TouchableOpacity>
</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}