import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { checkRateLimit } from "@/lib/rate-limit";

export function rejectReadRateLimit(
  request: NextRequest,
  key: string,
  options: { limit: number; windowMs: number }
): NextResponse | null {
  const limit = checkRateLimit(key, options);
  if (limit.allowed) return null;

  const t = getRequestTranslator(request);
  return NextResponse.json(
    { error: t("errors.rateLimit") },
    {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSec) },
    }
  );
}
