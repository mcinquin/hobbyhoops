import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { getAuthSecret } from "@/lib/auth-secret";

export function authConfigError(): string | null {
  try {
    getAuthSecret();
    return null;
  } catch {
    return "misconfigured";
  }
}

export function authMisconfiguredResponse(
  request: NextRequest
): NextResponse | null {
  const error = authConfigError();
  if (!error) return null;
  const t = getRequestTranslator(request);
  return NextResponse.json(
    { error: t("errors.authMisconfigured") },
    { status: 503 }
  );
}
