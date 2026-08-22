import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Stop,
} from "react-native-svg";

/**
 * RentalShield brand mark — a shield whose interior is a camera aperture,
 * framed by viewfinder crop marks. Protection + photographic evidence in one
 * shape, so it reads as forensic capture rather than a generic security badge.
 *
 * All geometry lives on a 100x100 viewBox and is mirrored by
 * scripts/generate-brand-assets.mjs, which rasterizes the same paths into the
 * app icon and splash PNGs. Change one, change the other.
 */

// Aperture: an outer hexagon (r=17) and an inner opening (r=7) rotated -25deg.
// Spokes run outer[i] -> inner[i], so they all lean the same way and read as
// iris blades. Connecting symmetric vertices instead would draw a hexagram.
const OUTER = [
  [50, 28],
  [64.72, 36.5],
  [64.72, 53.5],
  [50, 62],
  [35.28, 53.5],
  [35.28, 36.5],
] as const;

const INNER = [
  [52.96, 38.66],
  [56.97, 44.39],
  [54.02, 50.73],
  [47.04, 51.34],
  [43.03, 45.61],
  [45.98, 39.27],
] as const;

const pts = (v: readonly (readonly [number, number])[] | typeof OUTER) =>
  v.map(([x, y]) => `${x},${y}`).join(" ");

const OUTER_PTS = pts(OUTER);
const INNER_PTS = pts(INNER);

const SHIELD =
  "M50 7 L86 20.5 V49 C86 70 70 86 50 94 C30 86 14 70 14 49 V20.5 Z";

const BRACKETS = [
  "M6 20 V6 H20",
  "M80 6 H94 V20",
  "M94 80 V94 H80",
  "M20 94 H6 V80",
];

const EDGE = "url(#rsEdge)";

function Brackets() {
  return (
    <>
      {BRACKETS.map((d, i) => (
        <Path
          key={i}
          d={d}
          fill="none"
          stroke="#34D399"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.5}
        />
      ))}
    </>
  );
}

function Aperture() {
  return (
    <G>
      <Polygon
        points={OUTER_PTS}
        fill="none"
        stroke={EDGE}
        strokeWidth={3.4}
        strokeLinejoin="round"
      />
      {OUTER.map(([x1, y1], i) => (
        <Line
          key={i}
          x1={x1}
          y1={y1}
          x2={INNER[i][0]}
          y2={INNER[i][1]}
          stroke={EDGE}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.7}
        />
      ))}
      <Polygon points={INNER_PTS} fill="#6EE7B7" />
    </G>
  );
}

function Gradient() {
  return (
    <Defs>
      <LinearGradient id="rsEdge" x1="20" y1="4" x2="82" y2="96">
        <Stop offset="0" stopColor="#6EE7B7" />
        <Stop offset="0.45" stopColor="#34D399" />
        <Stop offset="1" stopColor="#059669" />
      </LinearGradient>
    </Defs>
  );
}

/** Shield + aperture, without the corner brackets. */
export function BrandShield({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Gradient />
      <Path d={SHIELD} fill="#0B1215" />
      <Path
        d={SHIELD}
        fill="none"
        stroke={EDGE}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Aperture />
    </Svg>
  );
}

/** Viewfinder corner brackets, sized to sit just outside the shield. */
export function BrandFrame({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Brackets />
    </Svg>
  );
}

export function BrandMark({
  size = 96,
  withFrame = true,
}: {
  size?: number;
  /** Viewfinder corner brackets. Drop them when the mark sits inline in text. */
  withFrame?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Gradient />
      {withFrame && <Brackets />}
      <G transform={withFrame ? "translate(6 6) scale(0.88)" : undefined}>
        <Path d={SHIELD} fill="#0B1215" />
        <Path
          d={SHIELD}
          fill="none"
          stroke={EDGE}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        <Aperture />
      </G>
    </Svg>
  );
}
