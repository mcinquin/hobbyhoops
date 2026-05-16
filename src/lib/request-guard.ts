import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";

const SAFE_FETCH_SITES = new Set(["same-origin", "none"]);

export function rejectCrossSiteMutation(
  request: NextRequest
): NextResponse | null {
  const t = getRequestTranslator(request);
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      if (new URL(origin).origin !== requestOrigin) {
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
