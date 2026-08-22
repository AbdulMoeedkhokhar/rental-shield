import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { and, desc, eq, isNull } from "drizzle-orm";
import { useRouter } from "expo-router";
import { Building2, ChevronRight, LogOut, Plus } from "lucide-react-native";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SyncStatus } from "@/components/ui/SyncStatus";
import { colors } from "@/constants/colors";
import { db } from "@/db/client";
import { properties } from "@/db/schema";
import { useEntitlement } from "@/hooks/use-entitlement";
import { useAuthStore } from "@/stores/auth";

export default function DashboardScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const signOut = useAuthStore((s) => s.signOut);
  const entitlement = useEntitlement();

  // Live query: re-renders when a capture or sync writes, no manual refetch.
  const { data } = useLiveQuery(
    db
      .select()
      .from(properties)
      .where(
        and(eq(properties.userId, userId ?? ""), isNull(properties.deletedAt))
      )
      .orderBy(desc(properties.createdAt)),
    [userId]
  );

  return (
    <AppScreen
      title="Your Properties"
      subtitle={
        entitlement.isPro
          ? "Pro — unlimited properties and photos"
          : `Free plan · ${entitlement.photosRemaining} of ${entitlement.limits.photos} photos left`
      }
      action={
        <TouchableOpacity
          onPress={() => signOut()}
          className="w-10 h-10 rounded-xl bg-surface-card border border-slate-800 items-center justify-center"
        >
          <LogOut size={18} color={colors.ink.subtle} />
        </TouchableOpacity>
      }
      footer={
        entitlement.canAddProperty ? (
          <PrimaryButton
            label="Add Property"
            onPress={() => router.push("/(app)/property/new")}
            icon={<Plus size={18} color={colors.surface.dark} strokeWidth={2.5} />}
          />
        ) : (
          <View className="bg-surface-card border border-brand-500/40 rounded-xl px-5 py-4">
            <Text className="text-white font-semibold text-center">
              Free plan covers one property
            </Text>
            <Text className="text-slate-400 text-sm text-center mt-1">
              Upgrade to document more than one rental.
            </Text>
          </View>
        )
      }
    >
      <SyncStatus />

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            icon={<Building2 size={26} color={colors.ink.muted} />}
            title="No properties yet"
            message="Add the rental you want to document, then start a move-in inspection."
          />
        }
        contentContainerStyle={
          (data ?? []).length === 0 ? { flexGrow: 1 } : undefined
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/property/${item.id}`)}
            className="bg-surface-card border border-slate-800 rounded-xl p-4 mb-3 flex-row items-center"
          >
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">
                {item.addressLine1}
              </Text>
              <Text className="text-slate-400 text-sm mt-0.5">
                {[item.city, item.stateProvince].filter(Boolean).join(", ")}
              </Text>
            </View>
            {item.syncedAt == null ? (
              <View className="px-2 py-1 rounded-md bg-amber-500/15 mr-2">
                <Text className="text-amber-400 text-[10px] font-bold">
                  UNSYNCED
                </Text>
              </View>
            ) : null}
            <ChevronRight size={18} color={colors.ink.muted} />
          </TouchableOpacity>
        )}
      />
    </AppScreen>
  );
}
