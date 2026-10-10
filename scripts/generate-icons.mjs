#!/usr/bin/env node
// Renders the app icon + iOS splash screens from SVG. Output is committed;
// re-run with `npm run icons` after changing the artwork.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = (...p) => path.join(root, "public", ...p);

const glyph = `
  <g transform="translate(256 262) scale(0.78) translate(-20 0)">
    <path d="M-150 -70h300a90 90 0 0 1 87 112l-22 92a56 56 0 0 1-97 24l-36-50h-102l-36 50a56 56 0 0 1-97-24l-22-92a90 90 0 0 1 87-112Z"
      fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.9)" stroke-width="10"/>
    <path d="M-120 -14v68M-154 20h68" stroke="#fff" stroke-width="20" stroke-linecap="round"/>
    <circle cx="96" cy="4" r="17" fill="#fff"/>
    <circle cx="140" cy="40" r="17" fill="#fff"/>
  </g>`;

const iconSvg = (size, { maskable = false } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a84ff"/>
      <stop offset="0.55" stop-color="#5e5ce6"/>
      <stop offset="1" stop-color="#bf5af2"/>
    </linearGradient>
    <radialGradient id="spec" cx="0.3" cy="0.15" r="0.75">
      <stop offset="0" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="0.6" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#bg)"/>
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#spec)"/>
  <g transform="${maskable ? "translate(51 51) scale(0.8)" : ""}">${glyph}</g>
</svg>`;

// Common iPhone/iPad portrait resolutions (CSS px * DPR).
const splashes = [
  [1290, 2796, 430, 932, 3],
  [1179, 2556, 393, 852, 3],
  [1284, 2778, 428, 926, 3],
  [1170, 2532, 390, 844, 3],
  [1125, 2436, 375, 812, 3],
  [1242, 2688, 414, 896, 3],
  [828, 1792, 414, 896, 2],
  [750, 1334, 375, 667, 2],
  [1640, 2360, 820, 1180, 2],
  [2048, 2732, 1024, 1366, 2],
];

const splashSvg = (w, h) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="a" cx="0.2" cy="0.2" r="0.6"><stop offset="0" stop-color="#1d4ed8"/><stop offset="1" stop-color="#05060a" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="0.8" cy="0.85" r="0.6"><stop offset="0" stop-color="#6d28d9"/><stop offset="1" stop-color="#05060a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="#05060a"/>
  <rect width="100%" height="100%" fill="url(#a)"/>
  <rect width="100%" height="100%" fill="url(#b)"/>
</svg>`;

async function main() {
  await mkdir(out("icons"), { recursive: true });
  await mkdir(out("splash"), { recursive: true });
  for (const s of [192, 512]) {
    await sharp(Buffer.from(iconSvg(s))).png().toFile(out("icons", `icon-${s}.png`));
    await sharp(Buffer.from(iconSvg(s, { maskable: true }))).png().toFile(out("icons", `maskable-${s}.png`));
  }
  await sharp(Buffer.from(iconSvg(180, { maskable: true }))).png().toFile(out("icons", "apple-touch-icon.png"));
  await writeFile(out("icons", "icon.svg"), iconSvg(512).trim());

  const links = [];
  for (const [w, h, cw, ch, dpr] of splashes) {
    const iconSize = Math.round(Math.min(w, h) * 0.28);
    const icon = await sharp(Buffer.from(iconSvg(iconSize))).png().toBuffer();
    const name = `splash-${w}x${h}.png`;
    await sharp(Buffer.from(splashSvg(w, h)))
      .composite([{ input: icon, gravity: "center" }])
      .png({ compressionLevel: 9 })
      .toFile(out("splash", name));
    links.push({ url: `/splash/${name}`, media: `(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)` });
  }
  await writeFile(path.join(root, "lib", "splash.json"), JSON.stringify(links, null, 2) + "\n");
  console.log(`✓ icons + ${links.length} splash screens`);
}

main();
