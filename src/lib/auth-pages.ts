import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { authConfigError } from "@/lib/auth-config";

export function authMisconfiguredPageResponse(
  request: NextRequest
): NextResponse | null {
  const error = authConfigError();
  if (!error) return null;
  const t = getRequestTranslator(request);
  return new NextResponse(t("errors.authMisconfigured"), {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
