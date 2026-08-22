import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, DoorOpen } from "lucide-react-native";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors } from "@/constants/colors";
import { db } from "@/db/client";
import { inspectionItems, inspectionRooms } from "@/db/schema";

export default function InspectionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Photo counts come from a join rather than a query per row, so the list
  // stays one query regardless of how many rooms exist.
  const { data } = useLiveQuery(
    db
      .select({
        id: inspectionRooms.id,
        roomName: inspectionRooms.roomName,
        orderIndex: inspectionRooms.orderIndex,
        photoCount: sql<number>`count(${inspectionItems.id})`,
      })
      .from(inspectionRooms)
      .leftJoin(
        inspectionItems,
        and(
          eq(inspectionItems.roomId, inspectionRooms.id),
          isNull(inspectionItems.deletedAt)
        )
      )
      .where(
        and(
          eq(inspectionRooms.inspectionId, id),
          isNull(inspectionRooms.deletedAt)
        )
      )
      .groupBy(inspectionRooms.id)
      .orderBy(asc(inspectionRooms.orderIndex)),
    [id]
  );

  return (
    <AppScreen
      title="Room Checklist"
      subtitle="Work through each area. Photos are hashed as you capture them."
      onBack={() => router.back()}
    >
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          (data ?? []).length === 0 ? { flexGrow: 1 } : undefined
        }
        ListEmptyComponent={
          <EmptyState
            icon={<DoorOpen size={26} color={colors.ink.muted} />}
            title="No rooms"
            message="This inspection has no rooms seeded."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/room/${item.id}?name=${encodeURIComponent(item.roomName)}`)}
            className="bg-surface-card border border-slate-800 rounded-xl p-4 mb-3 flex-row items-center"
          >
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">
                {item.roomName}
              </Text>
              <Text className="text-slate-400 text-sm mt-0.5">
                {item.photoCount === 0
                  ? "No photos yet"
                  : `${item.photoCount} photo${item.photoCount === 1 ? "" : "s"}`}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.ink.muted} />
          </TouchableOpacity>
        )}
      />
    </AppScreen>
  );
}
