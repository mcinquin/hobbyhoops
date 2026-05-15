import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth-session";
import { getSessionFromRequest, unauthorized } from "@/lib/auth-api";
import { normalizeUsername, validateNewPassword } from "@/lib/auth-validation";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  findUserById,
  getUsers,
  isUsernameTaken,
  saveUsers,
} from "@/lib/users-store";
import { deleteAllStoredSessionsForUser } from "@/lib/session-store";

export async function PUT(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized(request);

  const t = getRequestTranslator(request);

  let body: {
    currentPassword?: string;
    newUsername?: string;
    newPassword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("errors.invalidRequest") }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  if (!currentPassword) {
    return NextResponse.json(
      { error: t("errors.profileCurrentRequired") },
      { status: 400 }
    );
  }

  const users = getUsers();
  const user = findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: t("errors.profileNotFound") }, { status: 404 });
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json(
      { error: t("errors.profileWrongPassword") },
      { status: 401 }
    );
  }

  const newUsernameRaw =
    typeof body.newUsername === "string" ? body.newUsername.trim() : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

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

  const token = await createSessionToken(user.id, nextUsername);
  const res = NextResponse.json({ ok: true, username: nextUsername });
  res.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(SESSION_MAX_AGE_SEC, request)
  );
  return res;
}
