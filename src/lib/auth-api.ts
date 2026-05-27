import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { authMisconfiguredResponse } from "@/lib/auth-config";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import { verifySessionToken, type SessionPayload } from "@/lib/auth-session";

export function getSessionFromRequest(
  request: NextRequest
): SessionPayload | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function unauthorized(request: NextRequest): NextResponse {
  const t = getRequestTranslator(request);
  return NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 });
}

export function requireAuth(
  request: NextRequest
): SessionPayload | NextResponse {
  const misconfigured = authMisconfiguredResponse(request);
  if (misconfigured) return misconfigured;
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized(request);
  return session;
}
