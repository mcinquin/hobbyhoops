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
import {
  isBootstrapTokenRequired,
  isBootstrapTokenValid,
} from "@/lib/bootstrap-token";
import { hashPassword } from "@/lib/password";
import { parseJsonBody } from "@/lib/parse-json-body";
import { bootstrapFirstUser, type UserRecord } from "@/lib/users-store";
import { authMisconfiguredResponse } from "@/lib/auth-config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { rejectCrossSiteMutation } from "@/lib/request-guard";

export async function POST(request: NextRequest) {
  const misconfigured = authMisconfiguredResponse(request);
  if (misconfigured) return misconfigured;

  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;

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

  if (isBootstrapTokenRequired() && !isBootstrapTokenValid(request)) {
    return NextResponse.json(
      { error: t("errors.bootstrapUnavailable") },
      { status: 403 }
    );
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = bootstrapSchema.safeParse(parsedBody.data);
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
      { error: t("errors.bootstrapUnavailable") },
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
