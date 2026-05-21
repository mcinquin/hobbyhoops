import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";

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
  request: NextRequest,
  options?: { requireFetchMetadata?: boolean }
): NextResponse | null {
  const t = getRequestTranslator(request);
  const requestOrigin = getPublicOrigin(request);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (options?.requireFetchMetadata && !origin && !fetchSite) {
    return NextResponse.json(
      { error: t("errors.crossSiteRequest") },
      { status: 403 }
    );
  }

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

  if (fetchSite && !SAFE_FETCH_SITES.has(fetchSite)) {
    return NextResponse.json(
      { error: t("errors.crossSiteRequest") },
      { status: 403 }
    );
  }

  return null;
}
