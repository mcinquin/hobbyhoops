import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { getPublicOrigin } from "@/lib/request-url";

const SAFE_FETCH_SITES = new Set(["same-origin", "none"]);

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
