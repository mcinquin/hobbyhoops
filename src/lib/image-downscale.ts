const DEFAULT_MAX_DIMENSION = 1200;
const DEFAULT_JPEG_QUALITY = 0.85;

/**
 * Réduit une image côté navigateur (canvas → JPEG) avant envoi à l'API de
 * reconnaissance : épargne la bande passante et le serveur (pas de sharp).
 * Renvoie le fichier original si le décodage échoue (ex. HEIC non supporté
 * par le navigateur) — le serveur validera le format.
 */
export async function downscaleImageFile(
  file: File,
  maxDimension = DEFAULT_MAX_DIMENSION,
  quality = DEFAULT_JPEG_QUALITY
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(
        1,
        maxDimension / Math.max(bitmap.width, bitmap.height)
      );
      if (scale >= 1 && file.type === "image/jpeg") {
        return file;
      }

      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.drawImage(bitmap, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );
      if (!blob) return file;
      return new File([blob], "card.jpg", { type: "image/jpeg" });
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
