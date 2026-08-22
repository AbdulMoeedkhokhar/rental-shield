import { and, asc, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Camera, ImageOff } from "lucide-react-native";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { db } from "@/db/client";
import { inspectionItems } from "@/db/schema";
import { useEntitlement } from "@/hooks/use-entitlement";

export default function RoomScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const entitlement = useEntitlement();

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
        entitlement.isPro
          ? "Unlimited capture"
          : `${entitlement.photosRemaining} photos left on the free plan`
      }
      onBack={() => router.back()}
      footer={
        <PrimaryButton
          label={entitlement.canAddPhoto ? "Capture Photo" : "Photo Limit Reached"}
          onPress={() =>
            router.push(
              `/(app)/capture?roomId=${id}&title=${encodeURIComponent(name ?? "Room")}`
            )
          }
          disabled={!entitlement.canAddPhoto}
          icon={<Camera size={18} color={colors.surface.dark} strokeWidth={2.5} />}
        />
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
