import { useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors } from "@/constants/colors";

/**
 * Signatures are normalised into a fixed viewBox at capture time, so the
 * stored path data is independent of the device that drew it. A preview
 * thumbnail, a full-screen pad and the print renderer all draw the same
 * string at different sizes without rescaling anything.
 */
export const SIGNATURE_VIEWBOX = { width: 1000, height: 500 };

/** Width ÷ height of the viewBox. The drawing surface must match it. */
export const SIGNATURE_ASPECT =
  SIGNATURE_VIEWBOX.width / SIGNATURE_VIEWBOX.height;

/** Renders stored signature data at any size. */
export function SignatureView({
  data,
  height,
}: {
  data: string;
  height: number;
}) {
  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${SIGNATURE_VIEWBOX.width} ${SIGNATURE_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {data.split("|").map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={colors.brand[400]}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

/**
 * The drawing surface itself.
 *
 * Must not live inside a ScrollView — a pan gesture would be claimed by the
 * scroll view and the stroke would scroll the page instead of drawing. It is
 * meant to be presented full-screen, which is also simply a better surface to
 * sign on.
 */
export function SignaturePad({
  onChange,
}: {
  onChange: (paths: string | null) => void;
}) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const currentRef = useRef("");
  // The PanResponder is built once, so it would close over the initial
  // strokes forever. A ref is the live value it can safely read.
  const strokesRef = useRef<string[]>([]);
  const size = useRef({ width: 1, height: 1 });

  // Map touch coordinates into the shared viewBox.
  function point(x: number, y: number) {
    const nx = (x / size.current.width) * SIGNATURE_VIEWBOX.width;
    const ny = (y / size.current.height) * SIGNATURE_VIEWBOX.height;
    return `${nx.toFixed(1)},${ny.toFixed(1)}`;
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Claim the gesture outright so no ancestor can steal it mid-stroke.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentRef.current = `M${point(locationX, locationY)}`;
        setCurrent(currentRef.current);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentRef.current += ` L${point(locationX, locationY)}`;
        setCurrent(currentRef.current);
      },
      onPanResponderRelease: () => {
        const finished = currentRef.current;
        currentRef.current = "";
        setCurrent("");
        if (!finished) return;

        // onChange must not run inside a setState updater — React treats that
        // as updating another component mid-render and throws.
        const next = [...strokesRef.current, finished];
        strokesRef.current = next;
        setStrokes(next);
        onChange(next.join("|"));
      },
    })
  ).current;

  function onLayout(e: LayoutChangeEvent) {
    size.current = e.nativeEvent.layout;
  }

  const isEmpty = strokes.length === 0 && !current;

  return (
    <View
      {...responder.panHandlers}
      onLayout={onLayout}
      style={{ aspectRatio: SIGNATURE_ASPECT }}
      className="w-full bg-surface-card rounded-2xl overflow-hidden"
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SIGNATURE_VIEWBOX.width} ${SIGNATURE_VIEWBOX.height}`}
      >
        {[...strokes, current].filter(Boolean).map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke={colors.brand[400]}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </Svg>

      {isEmpty ? (
        <View
          className="absolute inset-0 items-center justify-center"
          pointerEvents="none"
        >
          <Text className="text-slate-600 text-base">Sign here</Text>
        </View>
      ) : null}
    </View>
  );
}

export function clearSignature(setter: (v: string | null) => void) {
  setter(null);
}
