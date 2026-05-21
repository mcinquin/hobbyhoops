import { NextRequest, NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { getUsers } from "@/lib/users-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`needs-bootstrap:${ip}`, {
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    const t = getRequestTranslator(request);
    return NextResponse.json(
      { error: t("errors.rateLimit") },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  return NextResponse.json({ needsBootstrap: getUsers().length === 0 });
}
