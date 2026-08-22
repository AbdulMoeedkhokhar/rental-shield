import { useRouter } from "expo-router";
import { Building2, Mail, MapPin, User } from "lucide-react-native";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { AuthField } from "@/components/ui/AuthField";
import { FormError } from "@/components/ui/FormError";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { createProperty } from "@/db/repositories/properties";
import { useForm } from "@/hooks/use-form";
import { propertySchema } from "@/lib/validation";
import { useAuthStore } from "@/stores/auth";

export default function NewPropertyScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);

  const form = useForm(propertySchema, {
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    landlordName: "",
    landlordEmail: "",
  });

  const handleSubmit = () =>
    form.submit(async (values) => {
      if (!userId) throw new Error("You are signed out.");
      // Quota is enforced inside createProperty, not here.
      await createProperty(userId, {
        ...values,
        addressLine2: values.addressLine2 || undefined,
        stateProvince: values.stateProvince || undefined,
        postalCode: values.postalCode || undefined,
        landlordName: values.landlordName || undefined,
        landlordEmail: values.landlordEmail || undefined,
      });
      router.back();
    });

  return (
    <AppScreen
      title="Add Property"
      subtitle="The rental you're documenting."
      onBack={() => router.back()}
      footer={
        <PrimaryButton
          label="Save Property"
          onPress={handleSubmit}
          loading={form.submitting}
        />
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <AuthField
            label="Street Address"
            icon={<Building2 size={18} color={colors.ink.muted} />}
            error={form.errors.addressLine1}
            value={form.values.addressLine1}
            onChangeText={(v) => form.setField("addressLine1", v)}
            placeholder="120 Maple Street"
            editable={!form.submitting}
          />
          <View className="mt-4">
            <AuthField
              label="Unit / Apt"
              icon={<Building2 size={18} color={colors.ink.muted} />}
              value={form.values.addressLine2}
              onChangeText={(v) => form.setField("addressLine2", v)}
              placeholder="Apt 4B (optional)"
              editable={!form.submitting}
            />
          </View>
          <View className="mt-4">
            <AuthField
              label="City"
              icon={<MapPin size={18} color={colors.ink.muted} />}
              error={form.errors.city}
              value={form.values.city}
              onChangeText={(v) => form.setField("city", v)}
              placeholder="Austin"
              editable={!form.submitting}
            />
          </View>
          <View className="mt-4 flex-row">
            <View className="flex-1 mr-2">
              <AuthField
                label="State"
                icon={<MapPin size={18} color={colors.ink.muted} />}
                value={form.values.stateProvince}
                onChangeText={(v) => form.setField("stateProvince", v)}
                placeholder="TX"
                editable={!form.submitting}
              />
            </View>
            <View className="flex-1 ml-2">
              <AuthField
                label="ZIP"
                icon={<MapPin size={18} color={colors.ink.muted} />}
                value={form.values.postalCode}
                onChangeText={(v) => form.setField("postalCode", v)}
                placeholder="78701"
                keyboardType="number-pad"
                editable={!form.submitting}
              />
            </View>
          </View>
          <View className="mt-4">
            <AuthField
              label="Landlord Name"
              icon={<User size={18} color={colors.ink.muted} />}
              value={form.values.landlordName}
              onChangeText={(v) => form.setField("landlordName", v)}
              placeholder="Optional"
              editable={!form.submitting}
            />
          </View>
          <View className="mt-4">
            <AuthField
              label="Landlord Email"
              icon={<Mail size={18} color={colors.ink.muted} />}
              error={form.errors.landlordEmail}
              value={form.values.landlordEmail}
              onChangeText={(v) => form.setField("landlordEmail", v)}
              placeholder="Where the report will be sent"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!form.submitting}
            />
          </View>

          <FormError message={form.formError} />
          <View className="h-6" />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
