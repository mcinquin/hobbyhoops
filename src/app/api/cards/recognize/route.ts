import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { rejectCrossSiteMutation } from "@/lib/request-guard";
import { rejectWriteRateLimit } from "@/lib/api-write-rate-limit";
import { auditLog } from "@/lib/audit-log";
import {
  identifyCard,
  isCardRecognitionConfigured,
} from "@/lib/card-recognition/cardsight";
import { RecognitionError } from "@/lib/card-recognition/errors";
import type { RecognizeApiResponse } from "@/lib/card-recognition/types";
import {
  CARD_PHOTO_MAX_BYTES,
  isCardPhotoSide,
  readCardPhotoFile,
  sniffImageMime,
} from "@/lib/card-photo-storage";
import { cardIdSchema } from "@/lib/card-schema";
import { getReferences, readCard } from "@/lib/data";
import { buildCardSuggestion } from "@/lib/recognition-match";
import { getRequestTranslator } from "@/i18n/request";

export const dynamic = "force-dynamic";

/** MIME acceptés par CardSight (le downscale client produit du JPEG). */
const RECOGNIZABLE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

const STORED_PHOTO_FILENAMES: Record<string, string[]> = {
  front: ["front.jpg", "front.jpeg", "front.png", "front.webp", "front.gif"],
  back: ["back.jpg", "back.jpeg", "back.png", "back.webp", "back.gif"],
};

function recognitionErrorResponse(
  error: RecognitionError,
  t: ReturnType<typeof getRequestTranslator>
): NextResponse {
  switch (error.code) {
    case "unconfigured":
    case "auth":
      return NextResponse.json(
        { error: t("errors.recognizeUnavailable") },
        { status: 503 }
      );
    case "quota":
      return NextResponse.json(
        { error: t("errors.recognizeQuota") },
        { status: 429 }
      );
    default:
      return NextResponse.json(
        { error: t("errors.recognizeFailed") },
        { status: 502 }
      );
  }
}

type ImageSource =
  | { ok: true; buffer: Buffer; mime: string }
  | { ok: false; response: NextResponse };

async function imageFromMultipart(
  request: NextRequest,
  t: ReturnType<typeof getRequestTranslator>
): Promise<ImageSource> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.invalidData") },
        { status: 400 }
      ),
    };
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.photoFileRequired") },
        { status: 400 }
      ),
    };
  }
  if (file.size === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.photoEmpty") },
        { status: 400 }
      ),
    };
  }
  if (file.size > CARD_PHOTO_MAX_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.photoTooLarge") },
        { status: 413 }
      ),
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = sniffImageMime(buffer);
  if (!mime || !RECOGNIZABLE_MIMES.has(mime)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.photoUnsupportedType") },
        { status: 400 }
      ),
    };
  }
  return { ok: true, buffer, mime };
}

async function imageFromStoredPhoto(
  request: NextRequest,
  t: ReturnType<typeof getRequestTranslator>
): Promise<ImageSource> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.invalidJson") },
        { status: 400 }
      ),
    };
  }

  const { cardId, side } = (body ?? {}) as { cardId?: unknown; side?: unknown };
  const cardIdParsed = cardIdSchema.safeParse(String(cardId ?? ""));
  const sideRaw = String(side ?? "");
  if (!cardIdParsed.success || !isCardPhotoSide(sideRaw)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.invalidData") },
        { status: 400 }
      ),
    };
  }
  if (!readCard(cardIdParsed.data)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.cardNotFound") },
        { status: 404 }
      ),
    };
  }

  for (const filename of STORED_PHOTO_FILENAMES[sideRaw]) {
    const stored = readCardPhotoFile(cardIdParsed.data, filename);
    if (!stored.ok) continue;
    const mime = sniffImageMime(stored.buffer) ?? stored.contentType;
    if (!RECOGNIZABLE_MIMES.has(mime)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: t("errors.photoUnsupportedType") },
          { status: 400 }
        ),
      };
    }
    return { ok: true, buffer: stored.buffer, mime };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: t("errors.photoFileRequired") },
      { status: 404 }
    ),
  };
}

/**
 * POST — reconnaissance d'une carte à partir d'une photo.
 * Multipart `file` (photo fraîchement sélectionnée, redimensionnée côté client)
 * ou JSON `{ cardId, side }` (photo déjà stockée sur le serveur).
 */
export async function POST(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  if (!isCardRecognitionConfigured()) {
    return NextResponse.json(
      { error: t("errors.recognizeUnavailable") },
      { status: 503 }
    );
  }

  // Chaque appel consomme le quota CardSight (750/mois en gratuit).
  const rateLimited = rejectWriteRateLimit(
    request,
    `cards:recognize:${gate.userId}`,
    { limit: 25, windowMs: 15 * 60 * 1000 }
  );
  if (rateLimited) return rateLimited;

  const contentType = request.headers.get("content-type") ?? "";
  const source = contentType.includes("multipart/form-data")
    ? await imageFromMultipart(request, t)
    : await imageFromStoredPhoto(request, t);
  if (!source.ok) return source.response;

  try {
    const recognized = await identifyCard(source.buffer, source.mime);

    auditLog("card.recognize", {
      user: gate.username,
      matched: recognized != null,
      confidence: recognized?.confidence ?? null,
    });

    const payload: RecognizeApiResponse = recognized
      ? {
          suggestion: buildCardSuggestion(recognized, getReferences()),
          warnings: recognized.warnings,
        }
      : { suggestion: null, warnings: [] };
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof RecognitionError) {
      return recognitionErrorResponse(error, t);
    }
    throw error;
  }
}
