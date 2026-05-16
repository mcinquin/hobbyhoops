import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth-session";
import { bootstrapSchema, validateNewPassword } from "@/lib/auth-validation";
import { hashPassword } from "@/lib/password";
import { bootstrapFirstUser, type UserRecord } from "@/lib/users-store";
import { authMisconfiguredResponse } from "@/lib/auth-config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const misconfigured = authMisconfiguredResponse(request);
  if (misconfigured) return misconfigured;

  const t = getRequestTranslator(request);
  const ip = getClientIp(request);
  const limit = checkRateLimit(`bootstrap:${ip}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: t("errors.bootstrapRateLimit") },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("errors.invalidRequest") }, { status: 400 });
  }

  const parsed = bootstrapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t("errors.bootstrapUsernameInvalid") },
      { status: 400 }
    );
  }
  const { username, password } = parsed.data;

  const pwdErr = validateNewPassword(password);
  if (pwdErr) {
    return NextResponse.json(
      { error: t(pwdErr.key, pwdErr.params) },
      { status: 400 }
    );
  }

  const newUser: UserRecord = {
    id: randomUUID(),
    username,
    passwordHash: hashPassword(password),
  };

  const created = await bootstrapFirstUser(newUser);
  if (created === "exists") {
    return NextResponse.json(
      { error: t("errors.bootstrapExists") },
      { status: 403 }
    );
  }

  const token = await createSessionToken(newUser.id, newUser.username);
  const res = NextResponse.json({ ok: true, username: newUser.username });
  res.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(SESSION_MAX_AGE_SEC, request)
  );
  return res;
}
