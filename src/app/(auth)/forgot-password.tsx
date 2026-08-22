import { useRouter } from "expo-router";
import { ArrowRight, Mail, MailCheck } from "lucide-react-native";
import { useState } from "react";
import { z } from "zod";

import { AuthField } from "@/components/ui/AuthField";
import { AuthScreen } from "@/components/ui/AuthScreen";
import { FormError } from "@/components/ui/FormError";
import { NoticeScreen } from "@/components/ui/NoticeScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { useForm } from "@/hooks/use-form";
import { useAuthStore } from "@/stores/auth";

const schema = z.object({ email: z.email("Enter a valid email address") });

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [sent, setSent] = useState(false);

  const form = useForm(schema, { email: "" });

  const handleSubmit = () =>
    form.submit(async ({ email }) => {
      await requestPasswordReset(email);
      // Shown regardless of whether the address exists — telling the user
      // otherwise would leak which emails have accounts.
      setSent(true);
    });

  if (sent) {
    return (
      <NoticeScreen
        icon={<MailCheck size={30} color={colors.brand[500]} />}
        title="Check your email"
        message={`If an account exists for ${form.values.email.trim()}, we sent a link to reset your password. Open it on this device.`}
        actionLabel="Back to Sign In"
        onAction={() => router.replace("/(auth)/login")}
      />
    );
  }

  return (
    <AuthScreen
      title="Reset Password"
      subtitle="Enter your email and we'll send you a link to set a new one."
      onBack={() => router.back()}
      footer={
        <PrimaryButton
          label="Send Reset Link"
          onPress={handleSubmit}
          loading={form.submitting}
          icon={
            <ArrowRight size={18} color={colors.surface.dark} strokeWidth={2.5} />
          }
        />
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
        onSubmitEditing={handleSubmit}
        returnKeyType="go"
      />

      <FormError message={form.formError} />
    </AuthScreen>
  );
}
