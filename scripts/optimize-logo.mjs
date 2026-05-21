import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoPath = join(root, "public/brand/logo.svg");

let svg = readFileSync(logoPath, "utf8");
const before = Buffer.byteLength(svg, "utf8");

svg = svg
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/\s+/g, " ")
  .replace(/>\s+</g, "><")
  .trim();

svg = svg.replace(/(-?\d*\.\d+)/g, (match) => {
  const value = Number(match);
  if (!Number.isFinite(value)) return match;
  return String(Math.round(value));
});

writeFileSync(logoPath, `${svg}\n`, "utf8");
const after = Buffer.byteLength(svg, "utf8");
console.log(`logo.svg: ${before} → ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`);
