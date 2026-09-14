import "server-only";

import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  CARD_PHOTO_MAX_BYTES,
  STOREABLE_CARD_PHOTO_MIME,
  contentTypeForCardPhotoFilename,
  isLocalCardPhotoUrl,
  publicCardPhotoUrl,
  type CardPhotoSide,
  type StoreableCardPhotoMime,
} from "@/lib/card-photo-constants";

export {
  ACCEPTED_IMAGE_MIME_TYPES,
  CARD_PHOTO_MAX_BYTES,
  CARD_PHOTO_SIDES,
  cardPhotoFileInputAccept,
  isCardPhotoSide,
  isLocalCardPhotoUrl,
  publicCardPhotoUrl,
  type CardPhotoSide,
} from "@/lib/card-photo-constants";

const CARD_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const SIDE_FILE_RE = /^(front|back)\.(webp|jpe?g|png|gif)$/i;

function getDataRoot(): string {
  const configured = process.env.HOBBYHOOPS_DB_PATH?.trim();
  const root = process.cwd();
  if (!configured) return path.join(root, "data");

  const resolved = path.resolve(root, configured);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      "HOBBYHOOPS_DB_PATH doit pointer dans le répertoire du projet."
    );
  }
  return path.dirname(resolved);
}

export function getCardPhotosRoot(): string {
  return path.join(getDataRoot(), "card-photos");
}

function cardPhotoDir(cardId: string): string {
  if (!CARD_ID_RE.test(cardId)) {
    throw new Error("invalid_card_id");
  }
  return path.join(getCardPhotosRoot(), cardId);
}

function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "image/gif";
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand === "avis") return "image/avif";
    if (
      brand === "heic" ||
      brand === "heix" ||
      brand === "hevc" ||
      brand === "mif1" ||
      brand === "msf1"
    ) {
      return "image/heic";
    }
  }
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return "image/bmp";
  }
  if (
    (buffer[0] === 0x49 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x2a &&
      buffer[3] === 0x00) ||
    (buffer[0] === 0x4d &&
      buffer[1] === 0x4d &&
      buffer[2] === 0x00 &&
      buffer[3] === 0x2a)
  ) {
    return "image/tiff";
  }
  if (
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    buffer[3] === 0x00
  ) {
    return "image/x-icon";
  }

  const head = buffer.subarray(0, 256).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) {
    return "image/svg+xml";
  }
  return null;
}

function normalizeDeclaredMime(mime: string): string {
  const base = mime.trim().toLowerCase().split(";")[0]?.trim() ?? "";
  if (base === "image/jpg") return "image/jpeg";
  if (base === "image/tif") return "image/tiff";
  if (base === "image/icon") return "image/x-icon";
  return base;
}

function resolveStoreableMime(
  sniffed: string | null,
  declared: string | null
): StoreableCardPhotoMime | null {
  if (sniffed && sniffed in STOREABLE_CARD_PHOTO_MIME) {
    return sniffed as StoreableCardPhotoMime;
  }
  if (declared && declared in STOREABLE_CARD_PHOTO_MIME) {
    return declared as StoreableCardPhotoMime;
  }
  return null;
}

export type SaveCardPhotoResult =
  | { ok: true; url: string; bytes: number }
  | {
      ok: false;
      code:
        | "too_large"
        | "empty"
        | "unsupported_type"
        | "svg_rejected"
        | "convert_failed"
        | "invalid_card_id";
    };

/**
 * Persists a card photo without re-encoding.
 * JPEG / PNG / GIF / WebP are stored as-is so the app runs on CPUs that cannot
 * load sharp (no x86-64-v2 / no Wasm SIMD), e.g. Intel Atom N2800.
 */
export async function saveCardPhoto(options: {
  cardId: string;
  side: CardPhotoSide;
  buffer: Buffer;
  declaredMime?: string | null;
}): Promise<SaveCardPhotoResult> {
  const { cardId, side, buffer } = options;
  if (!CARD_ID_RE.test(cardId)) {
    return { ok: false, code: "invalid_card_id" };
  }
  if (buffer.length === 0) {
    return { ok: false, code: "empty" };
  }
  if (buffer.length > CARD_PHOTO_MAX_BYTES) {
    return { ok: false, code: "too_large" };
  }

  const sniffed = sniffImageMime(buffer);
  if (sniffed === "image/svg+xml") {
    return { ok: false, code: "svg_rejected" };
  }

  const declared = options.declaredMime
    ? normalizeDeclaredMime(options.declaredMime)
    : null;

  if (declared === "image/svg+xml") {
    return { ok: false, code: "svg_rejected" };
  }

  const mime = sniffed ?? declared;
  const knownList = ACCEPTED_IMAGE_MIME_TYPES as readonly string[];
  const looksLikeImage =
    (mime != null && knownList.includes(mime)) ||
    (declared != null &&
      declared.startsWith("image/") &&
      declared !== "image/svg+xml") ||
    sniffed != null;

  if (!looksLikeImage) {
    return { ok: false, code: "unsupported_type" };
  }

  const storeable = resolveStoreableMime(sniffed, declared);
  if (!storeable) {
    // Formats that would need a converter (HEIC, AVIF, TIFF, …) — no sharp on Atom.
    return { ok: false, code: "convert_failed" };
  }

  const { ext } = STOREABLE_CARD_PHOTO_MIME[storeable];
  const dir = cardPhotoDir(cardId);
  fs.mkdirSync(dir, { recursive: true });

  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(`${side}.`)) {
      fs.unlinkSync(path.join(dir, name));
    }
  }

  const filename = `${side}${ext}`;
  const target = path.join(dir, filename);
  const tmp = path.join(
    dir,
    `.${side}-${createHash("sha1").update(buffer).digest("hex").slice(0, 8)}.tmp`
  );
  fs.writeFileSync(tmp, buffer);
  fs.renameSync(tmp, target);

  return {
    ok: true,
    url: publicCardPhotoUrl(cardId, side, ext),
    bytes: buffer.length,
  };
}

export type ReadCardPhotoResult =
  | { ok: true; buffer: Buffer; contentType: string; mtimeMs: number }
  | { ok: false };

export function readCardPhotoFile(
  cardId: string,
  filename: string
): ReadCardPhotoResult {
  if (!CARD_ID_RE.test(cardId) || !SIDE_FILE_RE.test(filename)) {
    return { ok: false };
  }

  const contentType = contentTypeForCardPhotoFilename(filename);
  if (!contentType) return { ok: false };

  const dir = path.join(getCardPhotosRoot(), cardId);
  const resolved = path.resolve(dir, filename);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    return { ok: false };
  }
  if (!fs.existsSync(resolved)) {
    return { ok: false };
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) return { ok: false };

  return {
    ok: true,
    buffer: fs.readFileSync(resolved),
    contentType,
    mtimeMs: stat.mtimeMs,
  };
}

export function deleteCardPhotoSide(cardId: string, side: CardPhotoSide): void {
  if (!CARD_ID_RE.test(cardId)) return;
  const dir = path.join(getCardPhotosRoot(), cardId);
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(`${side}.`)) {
      fs.unlinkSync(path.join(dir, name));
    }
  }
  try {
    if (fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  } catch {
    /* ignore */
  }
}

export function deleteAllCardPhotos(cardId: string): void {
  if (!CARD_ID_RE.test(cardId)) return;
  const dir = path.join(getCardPhotosRoot(), cardId);
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

export function deleteLocalPhotoIfStored(url: string | null | undefined): void {
  if (!url || !isLocalCardPhotoUrl(url)) return;
  const match = url.match(
    /^\/api\/card-photos\/([^/]+)\/(front|back)\.(webp|jpe?g|png|gif)$/i
  );
  if (!match) return;
  const cardId = decodeURIComponent(match[1]!);
  const side = match[2]!.toLowerCase() as CardPhotoSide;
  deleteCardPhotoSide(cardId, side);
}
