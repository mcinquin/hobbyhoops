import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestTranslator } from "@/i18n/request";
import { LOCALE_COOKIE, LOCALES } from "@/i18n/config";
import { isCookieSecure } from "@/lib/auth-secret";
import { parseJsonBody } from "@/lib/parse-json-body";
import { rejectCrossSiteMutation } from "@/lib/request-guard";

const localeBodySchema = z.object({ locale: z.enum(LOCALES) });

export async function POST(request: NextRequest) {
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;

  const t = getRequestTranslator(request);
  const parsedBody = await parseJsonBody(request, 4_096);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = localeBodySchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: t("errors.invalidLocale") }, { status: 400 });
  }
  const { locale } = parsed.data;

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
