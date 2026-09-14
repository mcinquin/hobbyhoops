export const CARD_PHOTO_SIDES = ["front", "back"] as const;
export type CardPhotoSide = (typeof CARD_PHOTO_SIDES)[number];

/** Limite par fichier (photos téléphone / scanner). */
export const CARD_PHOTO_MAX_BYTES = 15 * 1024 * 1024;

export const CARD_PHOTO_OUTPUT_EXT = ".webp";

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

export function isCardPhotoSide(value: string): value is CardPhotoSide {
  return (CARD_PHOTO_SIDES as readonly string[]).includes(value);
}

export function isLocalCardPhotoUrl(value: string): boolean {
  return /^\/api\/card-photos\/[^/]+\/(front|back)\.webp$/i.test(value);
}

export function publicCardPhotoUrl(cardId: string, side: CardPhotoSide): string {
  return `/api/card-photos/${encodeURIComponent(cardId)}/${side}${CARD_PHOTO_OUTPUT_EXT}`;
}

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
