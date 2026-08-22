import { Redirect, useRouter } from "expo-router";
import { Eye, EyeOff, Lock } from "lucide-react-native";
import { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { z } from "zod";

import { AuthField } from "@/components/ui/AuthField";
import { AuthScreen } from "@/components/ui/AuthScreen";
import { FormError } from "@/components/ui/FormError";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { useForm } from "@/hooks/use-form";
import { useAuthStore } from "@/stores/auth";

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
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm(schema, { password: "", confirmPassword: "" });

  const handleSubmit = () =>
    form.submit(async ({ password }) => {
      await updatePassword(password);
      // Clearing `recovery` releases the guard in (app)/_layout.
      router.replace("/(app)/dashboard");
    });

  // Reached without a recovery link — there is no session to update.
  if (!session) return <Redirect href="/(auth)/forgot-password" />;

  return (
    <AuthScreen
      title="Set New Password"
      subtitle="Choose a new password for your account."
      footer={
        <PrimaryButton
          label="Update Password"
          onPress={handleSubmit}
          loading={form.submitting}
        />
      }
    >
      <AuthField
        label="New Password"
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
