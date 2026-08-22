import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { Camera, Check, RotateCcw, X } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandFrame } from "@/components/ui/BrandMark";
import { FormError } from "@/components/ui/FormError";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  CONDITION_LABELS,
  CONDITION_STATUSES,
  type ConditionStatus,
} from "@/constants/checklist";
import { colors } from "@/constants/colors";
import { createItem } from "@/db/repositories/items";
import { useEntitlement } from "@/hooks/use-entitlement";
import { processCapture, type ForensicCapture } from "@/lib/capture";
import { isQuotaError } from "@/lib/entitlement";
import { useAuthStore } from "@/stores/auth";

export default function CaptureScreen() {
  const router = useRouter();
  const { roomId, title } = useLocalSearchParams<{
    roomId: string;
    title?: string;
  }>();

  const userId = useAuthStore((s) => s.user?.id);
  const entitlement = useEntitlement();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<ForensicCapture | null>(null);
  const [condition, setCondition] = useState<ConditionStatus>("pristine");

  const handleShutter = useCallback(async () => {
    if (!cameraRef.current || busy) return;
    setError(null);
    setBusy(true);
    try {
      // Stamp the moment of exposure, not the moment processing finishes.
      const capturedAt = Date.now();
      const picture = await cameraRef.current.takePictureAsync({
        quality: 1,
        exif: true,
      });
      if (!picture?.uri) throw new Error("The camera returned no image.");

      // Location permission is requested lazily, at the point it is used, so
      // the prompt has obvious context.
      await Location.requestForegroundPermissionsAsync().catch(() => null);

      setCaptured(await processCapture(picture.uri, capturedAt));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed.");
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const handleSave = useCallback(async () => {
    if (!captured || !userId || !roomId) return;
    setError(null);
    setBusy(true);
    try {
      await createItem(userId, {
        roomId,
        title: title ?? "Untitled",
        conditionStatus: condition,
        localUri: captured.localUri,
        thumbnailUri: captured.thumbnailUri,
        imageHash: captured.imageHash,
        capturedAt: captured.capturedAt,
        latitude: captured.latitude,
        longitude: captured.longitude,
        altitude: captured.altitude,
        heading: captured.heading,
      });
      await entitlement.refresh();
      router.back();
    } catch (e) {
      setError(
        isQuotaError(e)
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not save."
      );
    } finally {
      setBusy(false);
    }
  }, [captured, userId, roomId, title, condition, entitlement, router]);

  if (!permission) {
    return (
      <View className="flex-1 bg-surface-dark items-center justify-center">
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-surface-dark px-6 justify-center items-center">
        <View className="w-16 h-16 rounded-2xl bg-surface-card border border-brand-500/40 items-center justify-center mb-5">
          <Camera size={30} color={colors.brand[500]} />
        </View>
        <Text className="text-2xl font-extrabold text-white text-center">
          Camera access needed
        </Text>
        <Text className="text-slate-400 text-sm text-center mt-2">
          Condition reports are built from photos taken inside the app, so the
          timestamp and location can be attested.
        </Text>
        <View className="w-full mt-8">
          <PrimaryButton label="Allow Camera" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  // Review state: the photo is hashed and stored; only tagging remains.
  if (captured) {
    return (
      <SafeAreaView className="flex-1 bg-surface-dark">
        <StatusBar barStyle="light-content" />
        <View className="flex-1 px-6 py-4">
          <Image
            source={{ uri: captured.thumbnailUri }}
            style={{ width: "100%", height: 300, borderRadius: 16 }}
            contentFit="cover"
          />

          <Text className="text-xs text-slate-500 mt-3 font-mono" numberOfLines={1}>
            SHA-256 {captured.imageHash.slice(0, 32)}…
          </Text>
          {captured.latitude != null ? (
            <Text className="text-xs text-slate-500 mt-1 font-mono">
              {captured.latitude.toFixed(5)}, {captured.longitude?.toFixed(5)}
              {captured.heading != null
                ? ` · ${Math.round(captured.heading)}°`
                : ""}
            </Text>
          ) : (
            <Text className="text-xs text-amber-500/80 mt-1">
              No location fix — photo saved without coordinates.
            </Text>
          )}

          <Text className="text-xs font-semibold text-slate-300 uppercase tracking-wider mt-6 mb-3">
            Condition
          </Text>
          <View className="flex-row flex-wrap">
            {CONDITION_STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setCondition(status)}
                className={`px-4 py-2.5 rounded-xl mr-2 mb-2 border ${
                  condition === status
                    ? "bg-brand-500 border-brand-500"
                    : "bg-surface-card border-slate-800"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    condition === status ? "text-surface-dark" : "text-slate-300"
                  }`}
                >
                  {CONDITION_LABELS[status]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormError message={error} />

          <View className="flex-1 justify-end pb-2">
            <PrimaryButton
              label="Save to Report"
              onPress={handleSave}
              loading={busy}
              icon={<Check size={18} color={colors.surface.dark} strokeWidth={2.5} />}
            />
            <View className="mt-3">
              <PrimaryButton
                label="Retake"
                variant="secondary"
                onPress={() => setCaptured(null)}
                disabled={busy}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

      {/* Viewfinder brackets — the same motif as the app mark. */}
      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        <BrandFrame size={260} />
      </View>

      <SafeAreaView className="absolute inset-0" pointerEvents="box-none">
        <View className="flex-row justify-between items-center px-6 pt-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-black/50 items-center justify-center"
          >
            <X size={20} color="#fff" />
          </TouchableOpacity>
          <View className="bg-black/50 px-3 py-1.5 rounded-full">
            <Text className="text-white text-xs font-semibold">
              {entitlement.isPro
                ? title ?? "Capture"
                : `${entitlement.photosRemaining} photos left`}
            </Text>
          </View>
        </View>

        <View className="flex-1 justify-end items-center pb-10">
          {error ? (
            <View className="mx-6 mb-4 bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-3">
              <Text className="text-red-300 text-sm text-center">{error}</Text>
            </View>
          ) : null}

          {entitlement.canAddPhoto ? (
            <TouchableOpacity
              onPress={handleShutter}
              disabled={busy}
              className="w-20 h-20 rounded-full border-4 border-white/90 items-center justify-center bg-white/20"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="w-16 h-16 rounded-full bg-white" />
              )}
            </TouchableOpacity>
          ) : (
            <View className="mx-6">
              <View className="bg-surface-card border border-brand-500/40 rounded-xl px-5 py-4 mb-3">
                <Text className="text-white font-semibold text-center">
                  Free photo limit reached
                </Text>
                <Text className="text-slate-400 text-sm text-center mt-1">
                  Upgrade to keep documenting this property.
                </Text>
              </View>
              <PrimaryButton
                label="Back to Report"
                variant="secondary"
                onPress={() => router.back()}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
