import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Download, ShieldCheck, ShieldX } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { FormError } from "@/components/ui/FormError";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { CONDITION_LABELS, type ConditionStatus } from "@/constants/checklist";
import { colors } from "@/constants/colors";
import { db } from "@/db/client";
import { inspectionItems } from "@/db/schema";
import { useItemImage } from "@/hooks/use-item-image";
import { verifyIntegrity } from "@/lib/capture";
import { toMessage } from "@/lib/errors";
import { saveCopyToLibrary } from "@/lib/save-copy";
import { ensureOriginal } from "@/sync/media";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2.5 border-b border-slate-800/70">
      <Text className="text-slate-400 text-xs uppercase tracking-wider">
        {label}
      </Text>
      <Text className="text-slate-200 text-xs font-mono flex-1 text-right ml-4">
        {value}
      </Text>
    </View>
  );
}

export default function PhotoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data } = useLiveQuery(
    db.select().from(inspectionItems).where(eq(inspectionItems.id, id)).limit(1),
    [id]
  );
  const item = data?.[0];
  const uri = useItemImage(item ?? ({} as typeof inspectionItems.$inferSelect));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<"valid" | "invalid" | null>(null);

  if (!item) {
    return (
      <AppScreen title="Photo" onBack={() => router.back()}>
        <View />
      </AppScreen>
    );
  }

  async function handleSave() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await saveCopyToLibrary(item!);
      setNotice("Saved to your camera roll.");
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }

  /** Recomputes the digest from the file and compares it to the record. */
  async function handleVerify() {
    setError(null);
    setNotice(null);
    setVerdict(null);
    setBusy(true);
    try {
      const local = await ensureOriginal(item!);
      if (!local) throw new Error("The original is not available to verify.");
      const result = await verifyIntegrity(local, item!.imageHash);
      setVerdict(result.valid ? "valid" : "invalid");
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen
      title={item.title}
      subtitle={
        CONDITION_LABELS[item.conditionStatus as ConditionStatus] ??
        item.conditionStatus
      }
      onBack={() => router.back()}
      scroll
      footer={
        <>
          <PrimaryButton
            label="Save a Copy"
            onPress={handleSave}
            loading={busy}
            icon={
              <Download size={17} color={colors.surface.dark} strokeWidth={2.5} />
            }
          />
          <View className="mt-3">
            <PrimaryButton
              label="Verify Integrity"
              variant="secondary"
              onPress={handleVerify}
              disabled={busy}
            />
          </View>
        </>
      }
    >
      <>
        {uri ? (
          <Image
            source={{ uri }}
            style={{
              width: "100%",
              aspectRatio: 3 / 4,
              borderRadius: 16,
              backgroundColor: colors.surface.card,
            }}
            // contain, not cover: this is the evidence view, so the whole
            // frame has to be visible. Cropping could hide the damage.
            contentFit="contain"
          />
        ) : null}

        {verdict ? (
          <View
            className={`flex-row items-center rounded-xl px-4 py-3 mt-4 border ${
              verdict === "valid"
                ? "bg-brand-500/10 border-brand-500/40"
                : "bg-red-500/10 border-red-500/40"
            }`}
          >
            {verdict === "valid" ? (
              <ShieldCheck size={18} color={colors.brand[500]} />
            ) : (
              <ShieldX size={18} color="#F87171" />
            )}
            <Text
              className={`text-sm ml-2.5 flex-1 ${
                verdict === "valid" ? "text-brand-400" : "text-red-400"
              }`}
            >
              {verdict === "valid"
                ? "Digest matches. This file is unaltered since capture."
                : "Digest mismatch. This file differs from what was recorded."}
            </Text>
          </View>
        ) : null}

        {notice ? (
          <View className="bg-surface-card border border-slate-800 rounded-xl px-4 py-3 mt-4">
            <Text className="text-slate-300 text-sm">{notice}</Text>
          </View>
        ) : null}

        <FormError message={error} />

        <View className="mt-5">
          <Field label="Captured" value={new Date(item.capturedAt).toLocaleString()} />
          <Field
            label="Location"
            value={
              item.latitude != null
                ? `${item.latitude.toFixed(5)}, ${item.longitude?.toFixed(5)}`
                : "No fix"
            }
          />
          <Field
            label="Heading"
            value={item.heading != null ? `${Math.round(item.heading)}°` : "—"}
          />
          <Field
            label="Backed up"
            value={item.syncedAt ? new Date(item.syncedAt).toLocaleString() : "Pending"}
          />
        </View>

        <Text className="text-slate-400 text-xs uppercase tracking-wider mt-5 mb-1.5">
          SHA-256
        </Text>
        <Text className="text-slate-300 text-xs font-mono leading-5">
          {item.imageHash}
        </Text>

        <View className="h-4" />
      </>
    </AppScreen>
  );
}
