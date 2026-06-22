import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isCookieSecure, SESSION_COOKIE_NAME } from "./auth-secret";
import {
  encodeSessionToken,
  readSessionTokenPayload,
  type SessionPayload,
} from "./auth-session-crypto";
import { readRequestUserAgent } from "./session-metadata";
import {
  createStoredSession,
  enforceMaxSessionsForUser,
  extendStoredSessionExp,
  isStoredSessionValid,
  touchStoredSession,
} from "./session-store";

export type { SessionPayload } from "./auth-session-crypto";

const SESSION_DAYS = 30;
const SLIDING_RENEW_BEFORE_DAYS = 7;

export const SESSION_MAX_AGE_SEC = SESSION_DAYS * 24 * 60 * 60;
const SLIDING_RENEW_BEFORE_SEC = SLIDING_RENEW_BEFORE_DAYS * 24 * 60 * 60;

export async function createSessionToken(
  userId: string,
  username: string,
  request?: Pick<Request, "headers">
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_MAX_AGE_SEC;
  const sid = randomUUID();
  const userAgent = request ? (readRequestUserAgent(request) ?? "") : "";

  await createStoredSession({
    id: sid,
    userId,
    exp,
    createdAt: now,
    lastSeenAt: now,
    userAgent,
  });
  await enforceMaxSessionsForUser(userId);

  return encodeSessionToken({ userId, username, exp, sid });
}

export function verifySessionToken(
  token: string | undefined | null
): SessionPayload | null {
  const payload = readSessionTokenPayload(token);
  if (!payload) return null;
  if (!isStoredSessionValid(payload.sid, payload.userId, payload.exp)) {
    return null;
  }
  return payload;
}

export function maybeRefreshSessionToken(
  token: string | undefined | null
): { session: SessionPayload | null; refreshedToken: string | null } {
  const session = verifySessionToken(token);
  if (!session) return { session: null, refreshedToken: null };

  touchStoredSession(session.sid, session.userId);

  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = session.exp - now;
  if (secondsRemaining >= SLIDING_RENEW_BEFORE_SEC) {
    return { session, refreshedToken: null };
  }

  const newExp = now + SESSION_MAX_AGE_SEC;
  const extended = extendStoredSessionExp(
    session.sid,
    session.userId,
    session.exp,
    newExp
  );
  if (!extended) {
    return { session: null, refreshedToken: null };
  }

  const nextSession: SessionPayload = { ...session, exp: newExp };
  return {
    session: nextSession,
    refreshedToken: encodeSessionToken(nextSession),
  };
}

export function sessionCookieOptions(
  maxAgeSec: number,
  request?: Pick<Request, "headers">
) {
  return {
    httpOnly: true,
    secure: isCookieSecure(request),
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export function applySessionRefreshToResponse(
  response: NextResponse,
  request: NextRequest,
  token: string | undefined | null
): NextResponse {
  const { refreshedToken } = maybeRefreshSessionToken(token);
  if (refreshedToken) {
    response.cookies.set(
      SESSION_COOKIE_NAME,
      refreshedToken,
      sessionCookieOptions(SESSION_MAX_AGE_SEC, request)
    );
  }
  return response;
}
