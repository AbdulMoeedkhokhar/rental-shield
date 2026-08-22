// Rasterizes the RentalShield brand mark into every PNG the native builds need.
// Geometry here mirrors src/components/ui/BrandMark/index.tsx — keep them in sync.
// Run: node scripts/generate-brand-assets.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const OBSIDIAN = "#090D0E";

const OUTER = [[50,28],[64.72,36.5],[64.72,53.5],[50,62],[35.28,53.5],[35.28,36.5]];
const INNER = [[52.96,38.66],[56.97,44.39],[54.02,50.73],[47.04,51.34],[43.03,45.61],[45.98,39.27]];
const pts = (v) => v.map(([x, y]) => `${x},${y}`).join(" ");

const SHIELD = "M50 7 L86 20.5 V49 C86 70 70 86 50 94 C30 86 14 70 14 49 V20.5 Z";
const BRACKETS = ["M6 20 V6 H20", "M80 6 H94 V20", "M94 80 V94 H80", "M20 94 H6 V80"];

const brackets = () =>
  BRACKETS.map((d) =>
    `<path d="${d}" fill="none" stroke="#34D399" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>`
  ).join("");

const aperture = (stroke) => `
  <polygon points="${pts(OUTER)}" fill="none" stroke="${stroke}" stroke-width="3.4" stroke-linejoin="round"/>
  ${OUTER.map(([x1, y1], i) =>
    `<line x1="${x1}" y1="${y1}" x2="${INNER[i][0]}" y2="${INNER[i][1]}" stroke="${stroke}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`
  ).join("")}
  <polygon points="${pts(INNER)}" fill="#6EE7B7"/>`;

// scale shrinks the shield to leave room for the brackets / icon padding.
function mark({ withFrame = true, glow = false, scale = 0.88 } = {}) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="e" x1="20" y1="4" x2="82" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6EE7B7"/>
      <stop offset="0.45" stop-color="#34D399"/>
      <stop offset="1" stop-color="#059669"/>
    </linearGradient>
    <filter id="g" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  ${withFrame ? brackets() : ""}
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)" ${glow ? 'filter="url(#g)"' : ""}>
    <path d="${SHIELD}" fill="#0B1215"/>
    <path d="${SHIELD}" fill="none" stroke="url(#e)" stroke-width="5" stroke-linejoin="round"/>
    ${aperture("url(#e)")}
  </g>
</svg>`;
}

const monochrome = (scale) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">
    <path d="${SHIELD}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
    <polygon points="${pts(OUTER)}" fill="none" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/>
    <polygon points="${pts(INNER)}" fill="#fff"/>
  </g>
</svg>`;

const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: 900 }).resize(size, size).png();

const onObsidian = async (svg, size) => {
  // Rasterize first: sharp refuses a composite input larger than the canvas.
  const layer = await png(svg, size).toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: OBSIDIAN },
  })
    .composite([{ input: layer }])
    .png();
};

const targets = [
  // Transparent mark — the splash plugin paints backgroundColor behind it.
  ["assets/images/splash-icon.png", () => png(mark({ glow: true }), 1024)],
  // iOS icons must be opaque.
  ["assets/images/icon.png", () => onObsidian(mark({ glow: true, scale: 0.72 }), 1024)],
  ["assets/images/favicon.png", () => onObsidian(mark({ withFrame: false, scale: 0.92 }), 256)],
  // Adaptive foreground: the mark must sit inside the centre 66% safe zone.
  ["assets/images/android-icon-foreground.png",
    () => png(mark({ withFrame: false, glow: true, scale: 0.5 }), 1024)],
  ["assets/images/android-icon-background.png",
    () => sharp({ create: { width: 1024, height: 1024, channels: 4, background: OBSIDIAN } }).png()],
  ["assets/images/android-icon-monochrome.png", () => png(monochrome(0.5), 1024)],
];

for (const [path, build] of targets) {
  await writeFile(path, await (await build()).toBuffer());
  console.log("wrote", path);
}
