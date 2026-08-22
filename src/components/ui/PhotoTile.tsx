import { Image } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { CONDITION_LABELS, type ConditionStatus } from "@/constants/checklist";
import { colors } from "@/constants/colors";
import type { inspectionItems } from "@/db/schema";
import { useItemImage } from "@/hooks/use-item-image";

type Item = typeof inspectionItems.$inferSelect;

export function PhotoTile({
  item,
  onPress,
}: {
  item: Item;
  onPress?: () => void;
}) {
  const uri = useItemImage(item);
  // Nothing to show and nothing to fetch — the object is genuinely gone.
  const unavailable = !uri && !item.thumbnailUrl && !item.remoteUrl;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-1 bg-surface-card border border-slate-800 rounded-xl overflow-hidden"
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", aspectRatio: 1 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          style={{ width: "100%", aspectRatio: 1 }}
          className="items-center justify-center bg-surface-dark"
        >
          {unavailable ? (
            <ImageOff size={20} color={colors.ink.muted} />
          ) : (
            <ActivityIndicator size="small" color={colors.ink.muted} />
          )}
        </View>
      )}

      <View className="p-2.5">
        <Text className="text-white text-xs font-semibold" numberOfLines={1}>
          {CONDITION_LABELS[item.conditionStatus as ConditionStatus] ??
            item.conditionStatus}
        </Text>
        <Text className="text-slate-500 text-[10px] mt-0.5" numberOfLines={1}>
          {item.imageHash.slice(0, 12)}…
        </Text>
      </View>
    </TouchableOpacity>
  );
}
