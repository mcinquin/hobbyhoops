import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, isCookieSecure } from "@/lib/auth-secret";
import { verifySessionToken } from "@/lib/auth-session";
import { deleteStoredSession } from "@/lib/session-store";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  if (session) {
    await deleteStoredSession(session.sid);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
