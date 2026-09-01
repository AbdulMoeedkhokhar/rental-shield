import { and, asc, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Camera, ImageOff, Lock } from "lucide-react-native";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { db } from "@/db/client";
import { inspectionItems, inspectionRooms, inspections } from "@/db/schema";
import { useEntitlement } from "@/hooks/use-entitlement";

export default function RoomScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const entitlement = useEntitlement();

  const { data: parent } = useLiveQuery(
    db
      .select({ status: inspections.status })
      .from(inspectionRooms)
      .innerJoin(inspections, eq(inspections.id, inspectionRooms.inspectionId))
      .where(eq(inspectionRooms.id, id))
      .limit(1),
    [id]
  );
  const sealed = parent?.[0]?.status === "completed";

  const { data } = useLiveQuery(
    db
      .select()
      .from(inspectionItems)
      .where(
        and(eq(inspectionItems.roomId, id), isNull(inspectionItems.deletedAt))
      )
      .orderBy(asc(inspectionItems.capturedAt)),
    [id]
  );

  return (
    <AppScreen
      title={name ?? "Room"}
      subtitle={
        sealed
          ? "Signed and sealed — no further evidence can be added"
          : entitlement.isPro
            ? "Unlimited capture"
            : `${entitlement.photosRemaining} photos left on the free plan`
      }
      onBack={() => router.back()}
      footer={
        sealed ? (
          <View className="flex-row items-center bg-surface-card border border-brand-500/40 rounded-xl px-4 py-3.5">
            <Lock size={16} color={colors.brand[500]} />
            <Text className="text-slate-300 text-xs ml-2.5 flex-1">
              This record is sealed. Start a new inspection to document changes.
            </Text>
          </View>
        ) : (
          <PrimaryButton
            label={
              entitlement.canAddPhoto ? "Capture Photo" : "Photo Limit Reached"
            }
            onPress={() =>
              router.push(
                `/(app)/capture?roomId=${id}&title=${encodeURIComponent(name ?? "Room")}`
              )
            }
            disabled={!entitlement.canAddPhoto}
            icon={
              <Camera size={18} color={colors.surface.dark} strokeWidth={2.5} />
            }
          />
        )
      }
    >
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={
          (data ?? []).length === 0 ? { flexGrow: 1 } : { gap: 12 }
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ImageOff size={26} color={colors.ink.muted} />}
            title="Nothing documented here"
            message="Capture photos of walls, flooring, fixtures and anything already damaged."
          />
        }
        renderItem={({ item }) => (
          <PhotoTile
            item={item}
            onPress={() => router.push(`/(app)/photo/${item.id}`)}
          />
        )}
      />
    </AppScreen>
  );
}
