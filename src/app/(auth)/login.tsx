import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react-native";

import { AuthField } from "@/components/ui/AuthField";
import { AuthScreen } from "@/components/ui/AuthScreen";
import { FormError } from "@/components/ui/FormError";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { useForm } from "@/hooks/use-form";
import { signInSchema } from "@/lib/validation";
import { useAuthStore } from "@/stores/auth";

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm(signInSchema, { email: "", password: "" });

  const handleSubmit = () =>
    form.submit(async ({ email, password }) => {
      await signIn(email, password);
      // No navigation here: (auth)/_layout redirects once the session lands.
    });

  return (
    <AuthScreen
      title="Welcome Back"
      subtitle="Sign in to access your rental condition reports."
      onBack={() => router.back()}
      footer={
        <>
          <PrimaryButton
            label="Authenticate"
            onPress={handleSubmit}
            loading={form.submitting}
            icon={
              <ArrowRight
                size={18}
                color={colors.surface.dark}
                strokeWidth={2.5}
              />
            }
          />
          <View className="flex-row justify-center items-center mt-4">
            <Text className="text-slate-400 text-sm">
              Don&apos;t have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/signup")}>
              <Text className="text-brand-400 font-semibold text-sm">
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </>
      }
    >
      <AuthField
        label="Email Address"
        icon={<Mail size={18} color={colors.ink.muted} />}
        error={form.errors.email}
        value={form.values.email}
        onChangeText={(v) => form.setField("email", v)}
        placeholder="tenant@rentalshield.io"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        editable={!form.submitting}
      />

      <View className="mt-4">
        <AuthField
          label="Password"
          icon={<Lock size={18} color={colors.ink.muted} />}
          error={form.errors.password}
          value={form.values.password}
          onChangeText={(v) => form.setField("password", v)}
          placeholder="••••••••••••"
          secureTextEntry={!showPassword}
          autoComplete="current-password"
          editable={!form.submitting}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
          trailing={
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={18} color={colors.ink.muted} />
              ) : (
                <Eye size={18} color={colors.ink.muted} />
              )}
            </TouchableOpacity>
          }
        />
      </View>

      <TouchableOpacity
        onPress={() => router.push("/(auth)/forgot-password")}
        className="self-end mt-3"
      >
        <Text className="text-brand-400 font-semibold text-sm">
          Forgot password?
        </Text>
      </TouchableOpacity>

      <FormError message={form.formError} />
    </AuthScreen>
  );
}
