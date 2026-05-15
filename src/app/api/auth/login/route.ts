import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth-session";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit, getClientIp, peekRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { findUserByUsername } from "@/lib/users-store";
import { authMisconfiguredResponse } from "@/lib/auth-config";

export async function POST(request: NextRequest) {
  const misconfigured = authMisconfiguredResponse(request);
  if (misconfigured) return misconfigured;

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

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("errors.invalidRequest") }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) {
    return NextResponse.json({ error: t("errors.loginRequired") }, { status: 400 });
  }

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

  const token = await createSessionToken(user.id, user.username);
  const res = NextResponse.json({ ok: true, username: user.username });
  res.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(SESSION_MAX_AGE_SEC, request)
  );
  return res;
}
