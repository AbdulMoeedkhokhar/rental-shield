const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../assets/images');

// Cyber Shield SVG definition
const svgShield = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090D0E" />
      <stop offset="100%" stop-color="#131B1E" />
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="1024" height="1024" rx="220" fill="url(#bgGrad)" />

  <!-- Outer Neon Glow Border -->
  <rect x="32" y="32" width="960" height="960" rx="190" stroke="#10B981" stroke-opacity="0.25" stroke-width="8" />

  <!-- Center Shield Base -->
  <g filter="url(#glow)">
    <path d="M512 210L680 280V470C680 605 608 728 512 780C416 728 344 605 344 470V280L512 210Z" fill="#131B1E" stroke="url(#shieldGrad)" stroke-width="28" stroke-linejoin="round"/>
  </g>

  <!-- Center Checkmark / Lock Vector -->
  <path d="M445 490L490 535L585 435" stroke="#34D399" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`;

const svgForeground = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>
  <path d="M512 260L650 320V480C650 590 590 690 512 740C434 690 374 590 374 480V320L512 260Z" fill="#131B1E" stroke="url(#shieldGrad)" stroke-width="24" stroke-linejoin="round"/>
  <path d="M455 495L495 535L575 445" stroke="#34D399" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`;

async function generate() {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. App Icon (1024x1024)
  await sharp(Buffer.from(svgShield))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(targetDir, 'icon.png'));

  // 2. Android Adaptive Foreground
  await sharp(Buffer.from(svgForeground))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(targetDir, 'android-icon-foreground.png'));

  // 3. Android Adaptive Background
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 9, g: 13, b: 14, alpha: 1 },
    },
  })
    .png()
    .toFile(path.join(targetDir, 'android-icon-background.png'));

  // 4. Splash Icon
  await sharp(Buffer.from(svgForeground))
    .resize(512, 512)
    .png()
    .toFile(path.join(targetDir, 'splash-icon.png'));

  console.log('✅ Generated brand icons in assets/images/');
}

generate().catch(console.error);