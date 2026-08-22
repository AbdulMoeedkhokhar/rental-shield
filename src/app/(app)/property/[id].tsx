import { and, desc, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, ClipboardList, Plus } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormError } from "@/components/ui/FormError";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { db } from "@/db/client";
import { createInspection, type InspectionType } from "@/db/repositories/inspections";
import { inspections } from "@/db/schema";
import { useAuthStore } from "@/stores/auth";

const TYPE_LABELS: Record<InspectionType, string> = {
  move_in: "Move-In",
  move_out: "Move-Out",
  routine: "Routine",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export default function PropertyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = useLiveQuery(
    db
      .select()
      .from(inspections)
      .where(and(eq(inspections.propertyId, id), isNull(inspections.deletedAt)))
      .orderBy(desc(inspections.createdAt)),
    [id]
  );

  async function start(type: InspectionType) {
    if (!userId) return;
    setError(null);
    setBusy(true);
    try {
      const created = await createInspection(userId, id, type);
      router.push(`/(app)/inspection/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start inspection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen
      title="Inspections"
      subtitle="Each inspection is a dated record of this property's condition."
      onBack={() => router.back()}
      footer={
        <>
          <FormError message={error} />
          <View className="flex-row mt-2">
            <View className="flex-1 mr-2">
              <PrimaryButton
                label="Move-In"
                onPress={() => start("move_in")}
                loading={busy}
                icon={<Plus size={16} color={colors.surface.dark} strokeWidth={2.5} />}
              />
            </View>
            <View className="flex-1 ml-2">
              <PrimaryButton
                label="Move-Out"
                variant="secondary"
                onPress={() => start("move_out")}
                disabled={busy}
              />
            </View>
          </View>
        </>
      }
    >
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          (data ?? []).length === 0 ? { flexGrow: 1 } : undefined
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ClipboardList size={26} color={colors.ink.muted} />}
            title="No inspections yet"
            message="Start a move-in inspection to seed the room checklist."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/inspection/${item.id}`)}
            className="bg-surface-card border border-slate-800 rounded-xl p-4 mb-3 flex-row items-center"
          >
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">
                {TYPE_LABELS[item.inspectionType as InspectionType] ??
                  item.inspectionType}
              </Text>
              <Text className="text-slate-400 text-sm mt-0.5">
                {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.ink.muted} />
          </TouchableOpacity>
        )}
      />
    </AppScreen>
  );
}
