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
import { useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, Mail, MailCheck } from "lucide-react-native";
import { z } from "zod";

import { AuthField } from "../../components/ui/AuthField";
import { fieldErrors } from "../../lib/validation";
import { useAuthStore } from "../../stores/auth";

const schema = z.object({ email: z.email("Enter a valid email address") });

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);

  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setFormError(null);
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await requestPasswordReset(parsed.data.email);
      // Shown regardless of whether the address exists — telling the user
      // otherwise would leak which emails have accounts.
      setSent(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-surface-dark px-6 justify-center items-center">
        <StatusBar barStyle="light-content" />
        <View className="w-16 h-16 rounded-2xl bg-surface-card border border-brand-500/40 items-center justify-center mb-5">
          <MailCheck size={30} color="#10B981" />
        </View>
        <Text className="text-2xl font-extrabold text-white text-center">
          Check your email
        </Text>
        <Text className="text-slate-400 text-sm text-center mt-2">
          If an account exists for {email.trim()}, we sent a link to reset your
          password. Open it on this device.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          activeOpacity={0.8}
          className="w-full bg-brand-500 py-4 rounded-xl items-center mt-8"
        >
          <Text className="text-surface-dark font-bold text-base">
            Back to Sign In
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
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
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-surface-card border border-slate-800 items-center justify-center mb-6"
            >
              <ArrowLeft size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View className="mb-8">
              <Text className="text-3xl font-extrabold text-white tracking-tight">
                Reset Password
              </Text>
              <Text className="text-slate-400 text-sm mt-1">
                Enter your email and we'll send you a link to set a new one.
              </Text>
            </View>

            <AuthField
              label="Email Address"
              icon={<Mail size={18} color="#64748B" />}
              error={errors.email}
              value={email}
              onChangeText={setEmail}
              placeholder="tenant@rentalshield.io"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!submitting}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

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
              className={`w-full bg-brand-500 py-4 rounded-xl flex-row items-center justify-center shadow-lg shadow-brand-500/20 ${
                submitting ? "opacity-60" : ""
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#090D0E" />
              ) : (
                <>
                  <Text className="text-surface-dark font-bold text-base mr-2">
                    Send Reset Link
                  </Text>
                  <ArrowRight size={18} color="#090D0E" strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
