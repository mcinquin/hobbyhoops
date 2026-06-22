import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth-session";
import { getSessionFromRequest, unauthorized } from "@/lib/auth-api";
import {
  normalizeUsername,
  profileUpdateSchema,
  validateNewPassword,
} from "@/lib/auth-validation";
import { hashPassword, verifyPassword } from "@/lib/password";
import { parseJsonBody } from "@/lib/parse-json-body";
import {
  findUserById,
  getUsers,
  isUsernameTaken,
  saveUsers,
} from "@/lib/users-store";
import { deleteAllStoredSessionsForUser } from "@/lib/session-store";
import { rejectCrossSiteMutation } from "@/lib/request-guard";
import {
  checkRateLimit,
  getClientIp,
  peekRateLimit,
  resetRateLimit,
} from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit-log";

export async function PUT(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized(request);
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;

  const t = getRequestTranslator(request);
  const ip = getClientIp(request);

  const updateLimit = checkRateLimit(`profile:${ip}:${session.userId}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!updateLimit.allowed) {
    return NextResponse.json(
      { error: t("errors.profileRateLimit") },
      {
        status: 429,
        headers: { "Retry-After": String(updateLimit.retryAfterSec) },
      }
    );
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = profileUpdateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t("errors.profileCurrentRequired") },
      { status: 400 }
    );
  }
  const { currentPassword } = parsed.data;

  const users = getUsers();
  const user = findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: t("errors.profileNotFound") }, { status: 404 });
  }

  const passwordFailureKey = `profile-pwd:${ip}:${session.userId}`;
  const pwdLockout = peekRateLimit(passwordFailureKey, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!pwdLockout.allowed) {
    return NextResponse.json(
      { error: t("errors.profilePasswordRateLimit") },
      {
        status: 429,
        headers: { "Retry-After": String(pwdLockout.retryAfterSec) },
      }
    );
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    const failed = checkRateLimit(passwordFailureKey, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!failed.allowed) {
      return NextResponse.json(
        { error: t("errors.profilePasswordRateLimit") },
        {
          status: 429,
          headers: { "Retry-After": String(failed.retryAfterSec) },
        }
      );
    }
    return NextResponse.json(
      { error: t("errors.profileWrongPassword") },
      { status: 401 }
    );
  }

  resetRateLimit(passwordFailureKey);

  const newUsernameRaw =
    typeof parsed.data.newUsername === "string"
      ? parsed.data.newUsername.trim()
      : "";
  const newPassword = parsed.data.newPassword ?? "";

  if (!newUsernameRaw && !newPassword) {
    return NextResponse.json(
      { error: t("errors.profileChangeRequired") },
      { status: 400 }
    );
  }

  let nextUsername = user.username;
  let nextHash = user.passwordHash;

  if (newUsernameRaw) {
    if (newUsernameRaw.toLowerCase() !== user.username.toLowerCase()) {
      const normalized = normalizeUsername(newUsernameRaw);
      if (!normalized) {
        return NextResponse.json(
          { error: t("errors.bootstrapUsernameInvalid") },
          { status: 400 }
        );
      }
      if (isUsernameTaken(normalized, user.id)) {
        return NextResponse.json(
          { error: t("errors.profileUsernameTaken") },
          { status: 409 }
        );
      }
      nextUsername = normalized;
    }
  }

  if (newPassword) {
    const pwdErr = validateNewPassword(newPassword);
    if (pwdErr) {
      return NextResponse.json(
        { error: t(pwdErr.key, pwdErr.params) },
        { status: 400 }
      );
    }
    nextHash = hashPassword(newPassword);
  }

  const updated = users.map((u) =>
    u.id === user.id
      ? { ...u, username: nextUsername, passwordHash: nextHash }
      : u
  );
  await saveUsers(updated);

  await deleteAllStoredSessionsForUser(user.id);

  if (nextUsername !== user.username) {
    auditLog("auth.profile", {
      user: user.username,
      newUsername: nextUsername,
      ip,
    });
  }
  if (newPassword) {
    auditLog("auth.password", { user: nextUsername, ip });
  }

  const token = await createSessionToken(user.id, nextUsername, request);
  const res = NextResponse.json({ ok: true, username: nextUsername });
  res.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(SESSION_MAX_AGE_SEC, request)
  );
  return res;
}
