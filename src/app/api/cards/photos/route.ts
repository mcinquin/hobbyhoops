import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { rejectCrossSiteMutation } from "@/lib/request-guard";
import { rejectWriteRateLimit } from "@/lib/api-write-rate-limit";
import { readCard } from "@/lib/data";
import { cardIdSchema } from "@/lib/card-schema";
import {
  CARD_PHOTO_MAX_BYTES,
  deleteCardPhotoSide,
  isCardPhotoSide,
  saveCardPhoto,
} from "@/lib/card-photo-storage";
import { getRequestTranslator } from "@/i18n/request";
import { auditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

function errorForCode(
  code: string,
  t: ReturnType<typeof getRequestTranslator>
): { status: number; message: string } {
  switch (code) {
    case "too_large":
      return { status: 413, message: t("errors.photoTooLarge") };
    case "empty":
      return { status: 400, message: t("errors.photoEmpty") };
    case "unsupported_type":
      return { status: 400, message: t("errors.photoUnsupportedType") };
    case "svg_rejected":
      return { status: 400, message: t("errors.photoSvgRejected") };
    case "convert_failed":
      return { status: 400, message: t("errors.photoConvertFailed") };
    case "invalid_card_id":
      return { status: 400, message: t("errors.cardIdMissing") };
    default:
      return { status: 400, message: t("errors.invalidData") };
  }
}

/** POST multipart: file + side (front|back) + cardId */
export async function POST(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(
    request,
    `cards:photo:${gate.userId}`,
    { limit: 60, windowMs: 15 * 60 * 1000 }
  );
  if (rateLimited) return rateLimited;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: t("errors.invalidData") },
      { status: 400 }
    );
  }

  const sideRaw = String(form.get("side") ?? "");
  const cardIdParsed = cardIdSchema.safeParse(String(form.get("cardId") ?? ""));
  const file = form.get("file");

  if (!cardIdParsed.success) {
    return NextResponse.json(
      { error: t("errors.cardIdMissing") },
      { status: 400 }
    );
  }
  if (!isCardPhotoSide(sideRaw)) {
    return NextResponse.json(
      { error: t("errors.photoSideInvalid") },
      { status: 400 }
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: t("errors.photoFileRequired") },
      { status: 400 }
    );
  }
  if (file.size > CARD_PHOTO_MAX_BYTES) {
    return NextResponse.json(
      { error: t("errors.photoTooLarge") },
      { status: 413 }
    );
  }

  const card = readCard(cardIdParsed.data);
  if (!card) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveCardPhoto({
    cardId: cardIdParsed.data,
    side: sideRaw,
    buffer,
    declaredMime: file.type || null,
  });

  if (!saved.ok) {
    const err = errorForCode(saved.code, t);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  auditLog("card.photo.upload", {
    user: gate.username,
    id: cardIdParsed.data,
    side: sideRaw,
    bytes: saved.bytes,
  });

  return NextResponse.json({ url: saved.url, side: sideRaw });
}

/** DELETE ?cardId=&side= — retire le fichier d’une face */
export async function DELETE(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(
    request,
    `cards:photo:${gate.userId}`,
    { limit: 60, windowMs: 15 * 60 * 1000 }
  );
  if (rateLimited) return rateLimited;

  const cardIdParsed = cardIdSchema.safeParse(
    request.nextUrl.searchParams.get("cardId") ?? ""
  );
  const sideRaw = request.nextUrl.searchParams.get("side") ?? "";

  if (!cardIdParsed.success) {
    return NextResponse.json(
      { error: t("errors.cardIdMissing") },
      { status: 400 }
    );
  }
  if (!isCardPhotoSide(sideRaw)) {
    return NextResponse.json(
      { error: t("errors.photoSideInvalid") },
      { status: 400 }
    );
  }

  deleteCardPhotoSide(cardIdParsed.data, sideRaw);
  auditLog("card.photo.delete", {
    user: gate.username,
    id: cardIdParsed.data,
    side: sideRaw,
  });

  return NextResponse.json({ success: true });
}
