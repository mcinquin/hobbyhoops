import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { getSessionFromRequest, unauthorized } from "@/lib/auth-api";
import { summarizeUserAgent } from "@/lib/session-metadata";
import {
  deleteOtherStoredSessionsForUser,
  deleteStoredSessionForUser,
  listStoredSessionsForUser,
} from "@/lib/session-store";
import { rejectCrossSiteMutation } from "@/lib/request-guard";
import { auditLog } from "@/lib/audit-log";
import { getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized(request);

  const sessions = listStoredSessionsForUser(session.userId).map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt,
    lastSeenAt: entry.lastSeenAt,
    expiresAt: entry.expiresAt,
    device: summarizeUserAgent(entry.userAgent),
    current: entry.id === session.sid,
  }));

  return NextResponse.json({ sessions });
}

export async function DELETE(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized(request);

  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;

  const t = getRequestTranslator(request);
  const params = request.nextUrl.searchParams;
  const revokeOthers = params.get("others") === "1";
  const sessionId = params.get("id")?.trim();

  if (revokeOthers) {
    const removed = await deleteOtherStoredSessionsForUser(
      session.userId,
      session.sid
    );
    auditLog("auth.sessions.revokeOthers", {
      user: session.username,
      removed,
      ip: getClientIp(request),
    });
    return NextResponse.json({ ok: true, removed });
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: t("errors.sessionIdRequired") },
      { status: 400 }
    );
  }

  if (sessionId === session.sid) {
    return NextResponse.json(
      { error: t("errors.sessionRevokeCurrent") },
      { status: 400 }
    );
  }

  const removed = await deleteStoredSessionForUser(sessionId, session.userId);
  if (!removed) {
    return NextResponse.json(
      { error: t("errors.sessionNotFound") },
      { status: 404 }
    );
  }

  auditLog("auth.sessions.revoke", {
    user: session.username,
    sessionId,
    ip: getClientIp(request),
  });
  return NextResponse.json({ ok: true });
}
