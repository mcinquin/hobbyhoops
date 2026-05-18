import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";

const MAX_JSON_BODY_BYTES = 512 * 1024;
const SAFE_FETCH_SITES = new Set(["same-origin", "none"]);

function trustProxyHeaders(): boolean {
  return process.env.TRUST_PROXY?.trim().toLowerCase() === "true";
}

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function getPublicOrigin(request: NextRequest): string {
  const url = new URL(request.url);
  if (!trustProxyHeaders()) return url.origin;

  const proto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host"));

  if (!proto || !host) return url.origin;
  return `${proto.toLowerCase()}://${host.toLowerCase()}`;
}

export function rejectCrossSiteMutation(
  request: NextRequest
): NextResponse | null {
  const t = getRequestTranslator(request);
  const requestOrigin = getPublicOrigin(request);
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      if (new URL(origin).origin.toLowerCase() !== requestOrigin) {
        return NextResponse.json(
          { error: t("errors.crossSiteRequest") },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: t("errors.crossSiteRequest") },
        { status: 403 }
      );
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !SAFE_FETCH_SITES.has(fetchSite)) {
    return NextResponse.json(
      { error: t("errors.crossSiteRequest") },
      { status: 403 }
    );
  }

  return null;
}

export function rejectOversizedBody(
  request: NextRequest
): NextResponse | null {
  const length = request.headers.get("content-length");
  if (length && Number.parseInt(length, 10) > MAX_JSON_BODY_BYTES) {
    const t = getRequestTranslator(request);
    return NextResponse.json(
      { error: t("errors.payloadTooLarge") },
      { status: 413 }
    );
  }
  return null;
}
