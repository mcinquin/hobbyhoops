import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth-session";
import { loginSchema } from "@/lib/auth-validation";
import { verifyPassword } from "@/lib/password";
import { parseJsonBody } from "@/lib/parse-json-body";
import {
  checkRateLimit,
  getClientIp,
  peekRateLimit,
  resetRateLimit,
} from "@/lib/rate-limit";
import { rejectCrossSiteMutation } from "@/lib/request-guard";
import { deleteAllStoredSessionsForUser } from "@/lib/session-store";
import { findUserByUsername } from "@/lib/users-store";
import { authMisconfiguredResponse } from "@/lib/auth-config";
import { auditLog } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  const misconfigured = authMisconfiguredResponse(request);
  if (misconfigured) return misconfigured;

  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;

  const t = getRequestTranslator(request);
  const ip = getClientIp(request);
  const limit = checkRateLimit(`login:${ip}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: t("errors.loginRateLimit") },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = loginSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: t("errors.loginRequired") }, { status: 400 });
  }
  const { username, password } = parsed.data;

  const failureKey = `login-fail:${ip}:${username.toLowerCase()}`;
  const lockout = peekRateLimit(failureKey, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!lockout.allowed) {
    return NextResponse.json(
      { error: t("errors.loginAccountRateLimit") },
      {
        status: 429,
        headers: { "Retry-After": String(lockout.retryAfterSec) },
      }
    );
  }

  const user = findUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    const failed = checkRateLimit(failureKey, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!failed.allowed) {
      return NextResponse.json(
        { error: t("errors.loginAccountRateLimit") },
        {
          status: 429,
          headers: { "Retry-After": String(failed.retryAfterSec) },
        }
      );
    }
    return NextResponse.json(
      { error: t("errors.loginInvalid") },
      { status: 401 }
    );
  }

  resetRateLimit(failureKey);
  await deleteAllStoredSessionsForUser(user.id);

  const token = await createSessionToken(user.id, user.username);
  auditLog("auth.login", { user: user.username, ip });
  const res = NextResponse.json({ ok: true, username: user.username });
  res.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(SESSION_MAX_AGE_SEC, request)
  );
  return res;
}
