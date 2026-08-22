import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { Eye, EyeOff, Lock } from "lucide-react-native";
import { z } from "zod";

import { AuthField } from "../../components/ui/AuthField";
import { fieldErrors } from "../../lib/validation";
import { useAuthStore } from "../../stores/auth";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPasswordScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const updatePassword = useAuthStore((s) => s.updatePassword);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reached without a recovery link — there is no session to update.
  if (!session) return <Redirect href="/(auth)/forgot-password" />;

  async function handleSubmit() {
    setFormError(null);
    const parsed = schema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await updatePassword(parsed.data.password);
      // Clearing `recovery` releases the guard in (app)/_layout.
      router.replace("/(app)/dashboard");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-dark">
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingVertical: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <View className="mb-8 mt-4">
              <Text className="text-3xl font-extrabold text-white tracking-tight">
                Set New Password
              </Text>
              <Text className="text-slate-400 text-sm mt-1">
                Choose a new password for your account.
              </Text>
            </View>

            <AuthField
              label="New Password"
              icon={<Lock size={18} color="#64748B" />}
              error={errors.password}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              editable={!submitting}
              trailing={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={18} color="#64748B" />
                  ) : (
                    <Eye size={18} color="#64748B" />
                  )}
                </TouchableOpacity>
              }
            />

            <View className="mt-4">
              <AuthField
                label="Confirm Password"
                icon={<Lock size={18} color="#64748B" />}
                error={errors.confirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                editable={!submitting}
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
              />
            </View>

            {formError ? (
              <View className="mt-5 bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3">
                <Text className="text-red-400 text-sm">{formError}</Text>
              </View>
            ) : null}
          </View>

          <View className="mt-8">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
              className={`w-full bg-brand-500 py-4 rounded-xl items-center justify-center shadow-lg shadow-brand-500/20 ${
                submitting ? "opacity-60" : ""
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#090D0E" />
              ) : (
                <Text className="text-surface-dark font-bold text-base">
                  Update Password
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
