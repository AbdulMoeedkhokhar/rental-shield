import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronRight,
  ClipboardCheck,
  DoorOpen,
  Plus,
  Trash2,
} from "lucide-react-native";
import { useState } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SUGGESTED_ROOMS } from "@/constants/checklist";
import { colors } from "@/constants/colors";
import { addRoom, deleteRoom } from "@/db/repositories/inspections";
import { toMessage } from "@/lib/errors";
import { db } from "@/db/client";
import { inspectionItems, inspectionRooms, inspections } from "@/db/schema";

export default function InspectionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Photo counts come from a join rather than a query per row, so the list
  // stays one query regardless of how many rooms exist.
  const { data: parent } = useLiveQuery(
    db.select({ status: inspections.status }).from(inspections).where(eq(inspections.id, id)).limit(1),
    [id]
  );
  const sealed = parent?.[0]?.status === "completed";

  const [editing, setEditing] = useState(false);
  const [newRoom, setNewRoom] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(name: string) {
    setError(null);
    try {
      await addRoom(id, name);
      setNewRoom("");
    } catch (e) {
      setError(toMessage(e));
    }
  }

  async function handleDelete(roomId: string) {
    setError(null);
    try {
      await deleteRoom(roomId);
    } catch (e) {
      setError(toMessage(e));
    }
  }

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
      subtitle={
        sealed
          ? "Signed and sealed. This record can no longer be changed."
          : "Work through each area. Photos are hashed as you capture them."
      }
      onBack={() => router.back()}
      action={
        sealed ? undefined : (
          <TouchableOpacity
            onPress={() => {
              setEditing((v) => !v);
              setError(null);
            }}
            className="h-10 px-3.5 rounded-xl bg-surface-card border border-slate-800 items-center justify-center"
          >
            <Text className="text-brand-400 text-sm font-semibold">
              {editing ? "Done" : "Edit"}
            </Text>
          </TouchableOpacity>
        )
      }
      footer={
        <PrimaryButton
          label={sealed ? "View Signed Report" : "Review & Sign"}
          onPress={() => router.push(`/(app)/review/${id}`)}
          icon={
            <ClipboardCheck size={17} color={colors.surface.dark} strokeWidth={2.5} />
          }
        />
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
            icon={<DoorOpen size={26} color={colors.ink.muted} />}
            title="No rooms"
            message="This inspection has no rooms seeded."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            disabled={editing}
            onPress={() =>
              router.push(
                `/(app)/room/${item.id}?name=${encodeURIComponent(item.roomName)}`
              )
            }
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
            {editing ? (
              // Rooms holding evidence are not removable, so the control is
              // absent rather than present-and-failing.
              Number(item.photoCount) === 0 ? (
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 items-center justify-center"
                >
                  <Trash2 size={16} color="#F87171" />
                </TouchableOpacity>
              ) : (
                <Text className="text-slate-600 text-xs">Has evidence</Text>
              )
            ) : (
              <ChevronRight size={18} color={colors.ink.muted} />
            )}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          editing ? (
            <View className="mb-4">
              {error ? (
                <View className="bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3 mb-3">
                  <Text className="text-red-400 text-sm">{error}</Text>
                </View>
              ) : null}

              <View className="flex-row items-center bg-surface-card border border-slate-800 rounded-xl px-4 py-1.5">
                <TextInput
                  value={newRoom}
                  onChangeText={setNewRoom}
                  placeholder="Add a room"
                  placeholderTextColor={colors.ink.placeholder}
                  className="flex-1 text-white"
                  style={{ fontSize: 16, paddingVertical: 10 }}
                  returnKeyType="done"
                  onSubmitEditing={() => handleAdd(newRoom)}
                />
                <TouchableOpacity
                  onPress={() => handleAdd(newRoom)}
                  disabled={!newRoom.trim()}
                  className={`w-9 h-9 rounded-lg items-center justify-center ${
                    newRoom.trim() ? "bg-brand-500" : "bg-surface-dark"
                  }`}
                >
                  <Plus
                    size={17}
                    color={newRoom.trim() ? colors.surface.dark : colors.ink.muted}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
              </View>

              <Text className="text-slate-500 text-xs mt-4 mb-2">
                Common areas
              </Text>
              <View className="flex-row flex-wrap">
                {SUGGESTED_ROOMS.filter(
                  (name) =>
                    !(data ?? []).some(
                      (r) => r.roomName.toLowerCase() === name.toLowerCase()
                    )
                ).map((name) => (
                  <TouchableOpacity
                    key={name}
                    onPress={() => handleAdd(name)}
                    className="px-3.5 py-2 rounded-lg bg-surface-card border border-slate-800 mr-2 mb-2"
                  >
                    <Text className="text-slate-300 text-xs">{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
        }
      />
    </AppScreen>
  );
}
