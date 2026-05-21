import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";

const DEFAULT_MAX_JSON_BYTES = 512_000;

export async function parseJsonBody(
  request: NextRequest,
  maxBytes = DEFAULT_MAX_JSON_BYTES
): Promise<
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse }
> {
  const t = getRequestTranslator(request);
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const length = Number.parseInt(contentLength, 10);
    if (Number.isFinite(length) && length > maxBytes) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: t("errors.requestTooLarge") },
          { status: 413 }
        ),
      };
    }
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.invalidRequest") },
        { status: 400 }
      ),
    };
  }

  if (raw.length > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.requestTooLarge") },
        { status: 413 }
      ),
    };
  }

  if (!raw.trim()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.invalidRequest") },
        { status: 400 }
      ),
    };
  }

  try {
    return { ok: true, data: JSON.parse(raw) as unknown };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: t("errors.invalidJson") },
        { status: 400 }
      ),
    };
  }
}
