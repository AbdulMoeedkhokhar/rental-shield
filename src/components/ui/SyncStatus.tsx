import { sql } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Check, CloudUpload, RefreshCw } from "lucide-react-native";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/constants/colors";
import { db } from "@/db/client";
import { outbox } from "@/db/schema";
import { useSync } from "@/hooks/use-sync";

/**
 * Pending-mutation count with a manual retry. Reads the outbox directly, so it
 * reflects what will actually be sent rather than a separate status flag that
 * could disagree with it.
 */
export function SyncStatus() {
  const { sync, syncing, last } = useSync();
  const { data } = useLiveQuery(
    db.select({ n: sql<number>`count(*)` }).from(outbox)
  );

  const queued = data?.[0]?.n ?? 0;
  const failed = last?.ran === true && last.error;
  const restored = last?.ran === true ? last.pulled : 0;

  if (queued === 0 && !syncing && !failed) {
    return (
      <View className="flex-row items-center mb-3">
        <Check size={13} color={colors.brand[500]} />
        <Text className="text-slate-500 text-xs ml-1.5">
          {restored > 0
            ? `All evidence backed up · ${restored} restored`
            : "All evidence backed up"}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => sync()}
      disabled={syncing}
      className="flex-row items-center justify-between bg-surface-card border border-slate-800 rounded-xl px-4 py-2.5 mb-3"
    >
      <View className="flex-row items-center flex-1">
        {syncing ? (
          <ActivityIndicator size="small" color={colors.brand[400]} />
        ) : (
          <CloudUpload size={15} color={colors.ink.subtle} />
        )}
        <Text className="text-slate-300 text-xs ml-2.5 flex-1" numberOfLines={1}>
          {syncing
            ? "Backing up…"
            : failed
              ? `Sync paused — ${last.error}`
              : `${queued} change${queued === 1 ? "" : "s"} waiting to upload`}
        </Text>
      </View>
      {!syncing ? <RefreshCw size={14} color={colors.ink.muted} /> : null}
    </TouchableOpacity>
  );
}
