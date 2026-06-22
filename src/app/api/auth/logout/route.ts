import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import { sessionCookieOptions, verifySessionToken } from "@/lib/auth-session";
import { deleteStoredSession } from "@/lib/session-store";
import { rejectCrossSiteMutation } from "@/lib/request-guard";
import { auditLog } from "@/lib/audit-log";
import { getClientIp } from "@/lib/rate-limit";

import { buildPublicRequestUrl } from "@/lib/request-url";

function clearSessionCookie(request: NextRequest): NextResponse {
  const res = NextResponse.redirect(buildPublicRequestUrl(request, "/"));
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(0, request),
    maxAge: 0,
  });
  return res;
}

/** Déconnexion via redirection serveur (session révoquée côté SQLite). */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  if (session) {
    await deleteStoredSession(session.sid);
    auditLog("auth.logout", { user: session.username, ip: getClientIp(request) });
  }
  return clearSessionCookie(request);
}

export async function POST(request: NextRequest) {
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  if (session) {
    await deleteStoredSession(session.sid);
    auditLog("auth.logout", { user: session.username, ip: getClientIp(request) });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(0, request),
    maxAge: 0,
  });
  return res;
}
