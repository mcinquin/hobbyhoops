import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getLogger } from "./lib/logger.mjs";

const log = getLogger("optimize-logo");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoPath = join(root, "public/brand/logo.svg");

let svg = readFileSync(logoPath, "utf8");
const before = Buffer.byteLength(svg, "utf8");

svg = svg
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/\s+/g, " ")
  .replace(/>\s+</g, "><")
  .trim();

// Round floating-point coordinates in path data only — never touch XML attributes
// like version="1.0". We restrict the match to inside d="..." and similar path data.
svg = svg.replace(/\bd="([^"]*)"/g, (attrMatch, pathData) => {
  const rounded = pathData.replace(/(-?\d*\.\d+)/g, (num) => {
    const value = Number(num);
    return Number.isFinite(value) ? String(Math.round(value)) : num;
  });
  return `d="${rounded}"`;
});

writeFileSync(logoPath, `${svg}\n`, "utf8");
const after = Buffer.byteLength(svg, "utf8");
log.info({
  msg: "logo.svg optimisé",
  file: "public/brand/logo.svg",
  bytesBefore: before,
  bytesAfter: after,
  reductionPercent: Math.round((1 - after / before) * 100),
});
