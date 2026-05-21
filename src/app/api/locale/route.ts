import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { isCookieSecure } from "@/lib/auth-secret";
import { parseJsonBody } from "@/lib/parse-json-body";
import { rejectCrossSiteMutation } from "@/lib/request-guard";

export async function POST(request: NextRequest) {
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;

  const t = getRequestTranslator(request);
  const parsedBody = await parseJsonBody(request, 4_096);
  if (!parsedBody.ok) return parsedBody.response;

  const locale =
    typeof parsedBody.data === "object" &&
    parsedBody.data !== null &&
    "locale" in parsedBody.data
      ? (parsedBody.data as { locale?: string }).locale
      : undefined;

  if (!isLocale(locale)) {
    return NextResponse.json({ error: t("errors.invalidLocale") }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "strict",
    secure: isCookieSecure(request),
  });
  return response;
}
