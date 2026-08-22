import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MailCheck,
  User,
} from "lucide-react-native";

import { AuthField } from "@/components/ui/AuthField";
import { AuthScreen } from "@/components/ui/AuthScreen";
import { FormError } from "@/components/ui/FormError";
import { NoticeScreen } from "@/components/ui/NoticeScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { useForm } from "@/hooks/use-form";
import { signUpSchema } from "@/lib/validation";
import { useAuthStore } from "@/stores/auth";

export default function SignupScreen() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const [showPassword, setShowPassword] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const form = useForm(signUpSchema, {
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = () =>
    form.submit(async ({ fullName, email, password }) => {
      const outcome = await signUp(email, password, fullName);

      if (outcome === "already-registered") {
        form.setFormError(
          "An account with that email already exists. Sign in instead, or reset your password."
        );
        return;
      }
      // On "signed-in" Supabase returns a session and (auth)/_layout redirects
      // us out, so there is nothing to do here.
      if (outcome === "needs-confirmation") setAwaitingConfirmation(true);
    });

  if (awaitingConfirmation) {
    return (
      <NoticeScreen
        icon={<MailCheck size={30} color={colors.brand[500]} />}
        title="Confirm your email"
        message={`We sent a verification link to ${form.values.email.trim()}. Open it, then sign in.`}
        actionLabel="Go to Sign In"
        onAction={() => router.replace("/(auth)/login")}
      />
    );
  }

  return (
    <AuthScreen
      title="Create Account"
      subtitle="Start documenting your rental in forensic detail."
      onBack={() => router.back()}
      footer={
        <>
          <PrimaryButton
            label="Create Account"
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
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text className="text-brand-400 font-semibold text-sm">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </>
      }
    >
      <AuthField
        label="Full Name"
        icon={<User size={18} color={colors.ink.muted} />}
        error={form.errors.fullName}
        value={form.values.fullName}
        onChangeText={(v) => form.setField("fullName", v)}
        placeholder="Alex Morgan"
        autoCapitalize="words"
        autoComplete="name"
        editable={!form.submitting}
      />

      <View className="mt-4">
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
      </View>

      <View className="mt-4">
        <AuthField
          label="Password"
          icon={<Lock size={18} color={colors.ink.muted} />}
          error={form.errors.password}
          value={form.values.password}
          onChangeText={(v) => form.setField("password", v)}
          placeholder="At least 8 characters"
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          editable={!form.submitting}
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

      <View className="mt-4">
        <AuthField
          label="Confirm Password"
          icon={<Lock size={18} color={colors.ink.muted} />}
          error={form.errors.confirmPassword}
          value={form.values.confirmPassword}
          onChangeText={(v) => form.setField("confirmPassword", v)}
          placeholder="Re-enter your password"
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          editable={!form.submitting}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />
      </View>

      <FormError message={form.formError} />
    </AuthScreen>
  );
}
