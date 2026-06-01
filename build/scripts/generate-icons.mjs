/**
 * Generate app icons — paths for minimal mac-build repo (app/ sibling of build/).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assets = path.join(root, "..", "app", "assets");
const buildDir = path.join(root, "build");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
      <stop stop-color="#7c6ef7"/>
      <stop offset="1" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#g)"/>
  <rect x="16" y="18" width="8" height="8" rx="2" fill="#fbbf24"/>
  <rect x="28" y="19" width="20" height="6" rx="3" fill="#ffffff" fill-opacity="0.85"/>
  <rect x="16" y="30" width="8" height="8" rx="2" fill="#fbbf24"/>
  <rect x="28" y="31" width="16" height="6" rx="3" fill="#ffffff" fill-opacity="0.7"/>
  <rect x="16" y="42" width="8" height="8" rx="2" fill="#fbbf24"/>
  <rect x="28" y="43" width="22" height="6" rx="3" fill="#ffffff" fill-opacity="0.55"/>
</svg>`;

async function main() {
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(assets, { recursive: true });

  const sharp = (await import("sharp")).default;
  const png512 = await sharp(Buffer.from(svg)).png().toBuffer();
  const png256 = await sharp(png512).resize(256, 256).png().toBuffer();

  fs.writeFileSync(path.join(buildDir, "icon-512.png"), png512);
  fs.writeFileSync(path.join(assets, "logo.png"), png256);
  fs.copyFileSync(path.join(assets, "logo.png"), path.join(assets, "tray-icon.png"));

  try {
    const png2icons = (await import("png2icons")).default;
    const icns = png2icons.createICNS(png512, png2icons.BILINEAR, 0);
    if (icns) fs.writeFileSync(path.join(buildDir, "icon.icns"), Buffer.from(icns));
  } catch (e) {
    console.warn("ICNS:", e.message);
  }
  console.log("Icons OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
