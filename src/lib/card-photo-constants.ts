const CARD_PHOTO_SIDES = ["front", "back"] as const;
export type CardPhotoSide = (typeof CARD_PHOTO_SIDES)[number];

/** Limite par fichier (photos téléphone / scanner). */
export const CARD_PHOTO_MAX_BYTES = 15 * 1024 * 1024;

/** Formats stockés tels quels (pas de ré-encodage — compatible CPU sans SSE4.2 / Wasm SIMD). */
export const STOREABLE_CARD_PHOTO_MIME = {
  "image/jpeg": { ext: ".jpg", contentType: "image/jpeg" },
  "image/png": { ext: ".png", contentType: "image/png" },
  "image/gif": { ext: ".gif", contentType: "image/gif" },
  "image/webp": { ext: ".webp", contentType: "image/webp" },
} as const;

export type StoreableCardPhotoMime = keyof typeof STOREABLE_CARD_PHOTO_MIME;

const LOCAL_PHOTO_PATH_RE =
  /^\/api\/card-photos\/[^/]+\/(front|back)\.(webp|jpe?g|png|gif)$/i;

/** MIME acceptés à l’upload (formats image courants ; SVG exclu). */
export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
] as const;

/** Type guard for `front` / `back`. */
export function isCardPhotoSide(value: string): value is CardPhotoSide {
  return (CARD_PHOTO_SIDES as readonly string[]).includes(value);
}

/** Whether a URL points to a photo stored by the app (`/api/card-photos/...`). */
export function isLocalCardPhotoUrl(value: string): boolean {
  return LOCAL_PHOTO_PATH_RE.test(value);
}

/** Public URL of a stored card photo. */
export function publicCardPhotoUrl(
  cardId: string,
  side: CardPhotoSide,
  ext: string
): string {
  const normalized = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return `/api/card-photos/${encodeURIComponent(cardId)}/${side}${normalized}`;
}

/** `accept` attribute value for card photo file inputs. */
export function cardPhotoFileInputAccept(): string {
  return [
    ...ACCEPTED_IMAGE_MIME_TYPES,
    "image/*",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".avif",
    ".bmp",
    ".tif",
    ".tiff",
    ".heic",
    ".heif",
    ".ico",
  ].join(",");
}

/** Content type from a stored photo's extension, or null when unsupported. */
export function contentTypeForCardPhotoFilename(filename: string): string | null {
  const ext = filename.includes(".")
    ? `.${filename.split(".").pop()!.toLowerCase()}`
    : "";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  return null;
}
