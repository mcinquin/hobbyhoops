/**
 * Generates raster PNG icons required for PWA installation on Android and iOS.
 * Uses sharp (bundled with Next.js) to rasterise src/app/icon.svg.
 *
 * Outputs:
 *   public/icons/icon-192x192.png        – standard manifest icon
 *   public/icons/icon-512x512.png        – standard manifest icon
 *   public/icons/icon-maskable-512x512.png – maskable icon (safe zone = 80%)
 *   public/icons/apple-touch-icon.png    – 180×180 for iOS
 */

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getLogger } from "./lib/logger.mjs";

const log = getLogger("generate-pwa-icons");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconSvg = join(root, "src/app/icon.svg");
const outputDir = join(root, "public/icons");

mkdirSync(outputDir, { recursive: true });

const bg = { r: 10, g: 10, b: 10, alpha: 1 }; // #0a0a0a

/**
 * Renders the SVG at `size×size` with a solid background.
 */
async function render(size) {
  return sharp(iconSvg)
    .resize(size, size, { fit: "contain", background: bg })
    .flatten({ background: bg })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Creates a maskable icon where the content occupies the central 80% safe zone,
 * with 10% padding on each side filled with the background colour.
 */
async function renderMaskable(size) {
  const iconSize = Math.round(size * 0.8);
  const padding = Math.round((size - iconSize) / 2);

  const iconBuf = await sharp(iconSvg)
    .resize(iconSize, iconSize, { fit: "contain", background: bg })
    .flatten({ background: bg })
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: iconBuf, left: padding, top: padding }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function write(filename, buffer) {
  await sharp(buffer).toFile(join(outputDir, filename));
  log.info({ msg: "Icône PWA générée", file: `public/icons/${filename}` });
}

await write("icon-192x192.png", await render(192));
await write("icon-512x512.png", await render(512));
await write("icon-maskable-512x512.png", await renderMaskable(512));
await write("apple-touch-icon.png", await render(180));

log.info({ msg: "Icônes PWA générées" });
