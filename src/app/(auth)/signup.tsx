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
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MailCheck,
  User,
} from "lucide-react-native";

import { AuthField } from "../../components/ui/AuthField";
import { fieldErrors, signUpSchema } from "../../lib/validation";
import { useAuthStore } from "../../stores/auth";

export default function SignupScreen() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit() {
    setFormError(null);
    const parsed = signUpSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const outcome = await signUp(
        parsed.data.email,
        parsed.data.password,
        parsed.data.fullName
      );

      if (outcome === "already-registered") {
        setFormError(
          "An account with that email already exists. Sign in instead, or reset your password."
        );
        return;
      }
      // On "signed-in" Supabase returns a session and (auth)/_layout redirects
      // us out, so there is nothing to do here.
      if (outcome === "needs-confirmation") setAwaitingConfirmation(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <SafeAreaView className="flex-1 bg-surface-dark px-6 justify-center items-center">
        <StatusBar barStyle="light-content" />
        <View className="w-16 h-16 rounded-2xl bg-surface-card border border-brand-500/40 items-center justify-center mb-5">
          <MailCheck size={30} color="#10B981" />
        </View>
        <Text className="text-2xl font-extrabold text-white text-center">
          Confirm your email
        </Text>
        <Text className="text-slate-400 text-sm text-center mt-2">
          We sent a verification link to {email.trim()}. Open it, then sign in.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          activeOpacity={0.8}
          className="w-full bg-brand-500 py-4 rounded-xl items-center mt-8"
        >
          <Text className="text-surface-dark font-bold text-base">
            Go to Sign In
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
          // justifyContent/padding must live here, not in className: RN throws
          // if layout styles are applied to the ScrollView itself.
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
                Create Account
              </Text>
              <Text className="text-slate-400 text-sm mt-1">
                Start documenting your rental in forensic detail.
              </Text>
            </View>

            <View>
              <AuthField
                label="Full Name"
                icon={<User size={18} color="#64748B" />}
                error={errors.fullName}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Alex Morgan"
                autoCapitalize="words"
                autoComplete="name"
                editable={!submitting}
              />

              <View className="mt-4">
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
                />
              </View>

              <View className="mt-4">
                <AuthField
                  label="Password"
                  icon={<Lock size={18} color="#64748B" />}
                  error={errors.password}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  editable={!submitting}
                  trailing={
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color="#64748B" />
                      ) : (
                        <Eye size={18} color="#64748B" />
                      )}
                    </TouchableOpacity>
                  }
                />
              </View>

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
              className={`w-full bg-brand-500 py-4 rounded-xl flex-row items-center justify-center shadow-lg shadow-brand-500/20 ${
                submitting ? "opacity-60" : ""
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#090D0E" />
              ) : (
                <>
                  <Text className="text-surface-dark font-bold text-base mr-2">
                    Create Account
                  </Text>
                  <ArrowRight size={18} color="#090D0E" strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>

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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
