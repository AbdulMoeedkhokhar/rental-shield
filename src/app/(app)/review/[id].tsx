import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, CheckCircle2, CloudUpload, Lock } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { AuthField } from "@/components/ui/AuthField";
import { FormError } from "@/components/ui/FormError";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SignatureField } from "@/components/ui/SignatureField";
import { colors } from "@/constants/colors";
import { db } from "@/db/client";
import {
  completeInspection,
  inspectionSummary,
} from "@/db/repositories/inspections";
import { inspections } from "@/db/schema";
import { toMessage } from "@/lib/errors";

type Summary = Awaited<ReturnType<typeof inspectionSummary>>;

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View className="flex-1 bg-surface-card border border-slate-800 rounded-xl p-3.5">
      <Text className="text-white text-2xl font-extrabold">{value}</Text>
      <Text className="text-slate-400 text-xs mt-0.5">{label}</Text>
    </View>
  );
}

export default function ReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data } = useLiveQuery(
    db.select().from(inspections).where(eq(inspections.id, id)).limit(1),
    [id]
  );
  const inspection = data?.[0];
  const sealed = inspection?.status === "completed";

  const [summary, setSummary] = useState<Summary | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [tenantSignature, setTenantSignature] = useState<string | null>(null);
  const [landlordName, setLandlordName] = useState("");
  const [landlordSignature, setLandlordSignature] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  // Where the signing section starts, so a validation failure can bring it
  // into view instead of leaving the user staring at an unchanged screen.
  const signSectionY = useRef(0);
  const [busy, setBusy] = useState(false);
  // Per-field so the message lands next to the thing that is wrong. A single
  // banner below a long form is invisible from where the button is.
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Counts are aggregates, so they are computed rather than live-queried.
  useEffect(() => {
    inspectionSummary(id).then(setSummary);
  }, [id, inspection?.updatedAt]);

  async function handleComplete() {
    setError(null);

    const next: Record<string, string> = {};
    if (!tenantName.trim()) next.tenantName = "Enter the tenant's name.";
    if (!tenantSignature) next.tenantSignature = "A tenant signature is required.";
    // The landlord half is optional, but half-filled is a mistake worth
    // catching: a signature with nobody named cannot be attributed.
    if (landlordSignature && !landlordName.trim())
      next.landlordName = "Enter the landlord's name, or clear the signature.";

    setErrors(next);
    // The signature check is repeated so TypeScript can narrow it — the object
    // above proves nothing to the compiler.
    if (Object.keys(next).length > 0 || !tenantSignature) {
      scrollRef.current?.scrollTo({
        y: Math.max(0, signSectionY.current - 16),
        animated: true,
      });
      return;
    }

    setBusy(true);
    try {
      await completeInspection(id, {
        tenantSignature,
        tenantSignerName: tenantName,
        landlordSignature,
        landlordSignerName: landlordName,
      });
      router.back();
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen
      title={sealed ? "Signed Report" : "Review & Sign"}
      subtitle={
        sealed
          ? `Sealed ${new Date(inspection!.completedAt!).toLocaleDateString()}`
          : "Check the evidence, then sign to seal this record."
      }
      onBack={() => router.back()}
      scroll
      scrollRef={scrollRef}
      footer={
        sealed ? undefined : (
          <>
            <FormError message={error} />
            <View className={error ? "mt-3" : ""}>
              <PrimaryButton
                label="Sign & Complete"
                onPress={handleComplete}
                loading={busy}
                icon={
                  <Lock size={17} color={colors.surface.dark} strokeWidth={2.5} />
                }
              />
            </View>
          </>
        )
      }
    >
      <View className="flex-row gap-3">
        <Stat value={summary?.photos ?? 0} label="Photos" />
        <Stat value={summary?.issues ?? 0} label="Issues found" />
        <Stat
          value={`${summary?.documented ?? 0}/${summary?.rooms.length ?? 0}`}
          label="Rooms covered"
        />
      </View>

      {summary && summary.unsynced > 0 ? (
        <View className="flex-row items-center bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-3 mt-3">
          <CloudUpload size={16} color="#FBBF24" />
          <Text className="text-amber-300 text-xs ml-2.5 flex-1">
            {summary.unsynced} photo{summary.unsynced === 1 ? "" : "s"} not yet
            backed up. You can still sign — they upload when you reconnect.
          </Text>
        </View>
      ) : null}

      {/*
        Only warned about when there is nothing at all. The room list is a
        fixed template, so a studio or small flat legitimately leaves most of
        it empty — counting those as omissions would nag every user forever
        for a shape the app chose, not one they did.
      */}
      {summary && summary.photos === 0 ? (
        <View className="flex-row items-center bg-surface-card border border-slate-800 rounded-xl px-4 py-3 mt-3">
          <AlertTriangle size={16} color={colors.ink.subtle} />
          <Text className="text-slate-400 text-xs ml-2.5 flex-1">
            No photos captured yet. A signed report with no evidence proves
            nothing — document the areas you care about first.
          </Text>
        </View>
      ) : null}

      <Text className="text-xs font-semibold text-slate-300 uppercase tracking-wider mt-6 mb-2">
        Rooms
      </Text>
      {(summary?.rooms ?? []).map((room) => (
        <View
          key={room.roomId}
          className="flex-row items-center justify-between bg-surface-card border border-slate-800 rounded-xl px-4 py-3 mb-2"
        >
          <Text className="text-slate-200 text-sm flex-1">{room.roomName}</Text>
          {Number(room.photoCount) > 0 ? (
            <View className="flex-row items-center">
              <Text className="text-slate-400 text-xs mr-2">
                {room.photoCount} photo{Number(room.photoCount) === 1 ? "" : "s"}
              </Text>
              <CheckCircle2 size={15} color={colors.brand[500]} />
            </View>
          ) : (
            <Text className="text-slate-600 text-xs">Not documented</Text>
          )}
        </View>
      ))}

      {sealed ? (
        <View className="mt-6">
          <View className="flex-row items-center bg-brand-500/10 border border-brand-500/40 rounded-xl px-4 py-3">
            <Lock size={16} color={colors.brand[500]} />
            <Text className="text-brand-400 text-xs ml-2.5 flex-1">
              Signed by {inspection!.tenantSignerName}
              {inspection!.landlordSignerName
                ? ` and ${inspection!.landlordSignerName}`
                : ""}
              . This record can no longer be changed.
            </Text>
          </View>
        </View>
      ) : (
        <View
          className="mt-6"
          onLayout={(e) => {
            signSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <Text className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Tenant
          </Text>
          <AuthField
            label="Full Name"
            icon={<View />}
            error={errors.tenantName}
            value={tenantName}
            onChangeText={setTenantName}
            placeholder="Who is signing"
            editable={!busy}
          />
          <View className="mt-3">
            <SignatureField
              label="Tenant Signature"
              value={tenantSignature}
              onChange={setTenantSignature}
              error={errors.tenantSignature}
            />
          </View>

          <Text className="text-xs font-semibold text-slate-300 uppercase tracking-wider mt-6 mb-2">
            Landlord (optional)
          </Text>
          <Text className="text-slate-500 text-xs mb-3">
            Leave blank if they are not present. A one-sided record is still
            valid evidence.
          </Text>
          <AuthField
            label="Full Name"
            icon={<View />}
            error={errors.landlordName}
            value={landlordName}
            onChangeText={setLandlordName}
            placeholder="Who is signing"
            editable={!busy}
          />
          <View className="mt-3">
            <SignatureField
              label="Landlord Signature"
              value={landlordSignature}
              onChange={setLandlordSignature}
            />
          </View>
        </View>
      )}
    </AppScreen>
  );
}
