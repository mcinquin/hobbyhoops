import { randomUUID } from "crypto";
import { isCookieSecure } from "./auth-secret";
import {
  encodeSessionToken,
  readSessionTokenPayload,
  type SessionPayload,
} from "./auth-session-crypto";
import {
  createStoredSession,
  isStoredSessionValid,
} from "./session-store";

export type { SessionPayload } from "./auth-session-crypto";

const SESSION_DAYS = 7;

export async function createSessionToken(
  userId: string,
  username: string
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const sid = randomUUID();
  await createStoredSession({ id: sid, userId, exp });

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

export function sessionCookieOptions(
  maxAgeSec: number,
  request?: Pick<Request, "headers">
) {
  return {
    httpOnly: true,
    secure: isCookieSecure(request),
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export const SESSION_MAX_AGE_SEC = SESSION_DAYS * 24 * 60 * 60;
