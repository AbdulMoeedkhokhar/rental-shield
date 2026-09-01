import { X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SignaturePad, SignatureView } from "@/components/ui/SignaturePad";
import { colors } from "@/constants/colors";

/**
 * A tappable signature slot that opens a full-screen pad.
 *
 * The pad cannot be inline: drawing inside a scrolling form makes the scroll
 * view claim the pan gesture, so the stroke drags the page instead of leaving
 * a mark. A modal takes the surface out of the scroll tree entirely, and a
 * full screen is a better thing to sign on anyway.
 */
export function SignatureField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  // Held separately so cancelling leaves the committed signature untouched.
  const [draft, setDraft] = useState<string | null>(null);
  // Bumping this remounts the pad, which is how Clear resets its stroke
  // history. It must not be derived from `draft`: that changes on the first
  // stroke and would remount mid-signature, erasing what was just drawn.
  const [clearNonce, setClearNonce] = useState(0);

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange(null)}>
            <Text className="text-brand-400 text-xs font-semibold">Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
        activeOpacity={0.8}
        style={{ height: 110 }}
        className={`bg-surface-card border rounded-xl items-center justify-center overflow-hidden ${
          error ? "border-red-500/70" : "border-slate-800"
        }`}
      >
        {value ? (
          <SignatureView data={value} height={100} />
        ) : (
          <Text className="text-slate-500 text-sm">Tap to sign</Text>
        )}
      </TouchableOpacity>

      {error ? (
        <Text className="text-red-400 text-xs mt-1.5">{error}</Text>
      ) : null}

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-surface-dark">
          <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
            <TouchableOpacity
              onPress={() => setOpen(false)}
              className="w-10 h-10 rounded-xl bg-surface-card border border-slate-800 items-center justify-center"
            >
              <X size={18} color={colors.ink.subtle} />
            </TouchableOpacity>
            <Text className="text-white font-bold text-base">{label}</Text>
            <TouchableOpacity
              onPress={() => {
                setDraft(null);
                setClearNonce((n) => n + 1);
              }}
              className="h-10 px-3 rounded-xl bg-surface-card border border-slate-800 items-center justify-center"
            >
              <Text className="text-brand-400 text-sm font-semibold">Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Centred rather than stretched: the pad keeps the viewBox's own
              aspect ratio, so strokes are never distorted. */}
          <View className="flex-1 px-6 justify-center">
            <SignaturePad key={clearNonce} onChange={setDraft} />
            <Text className="text-slate-500 text-xs text-center mt-4">
              Sign inside the box with your finger.
            </Text>
          </View>

          <View className="px-6 pb-4">
            <PrimaryButton
              label="Use This Signature"
              disabled={!draft}
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
