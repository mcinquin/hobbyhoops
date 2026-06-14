import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { rejectReadRateLimit } from "@/lib/api-read-rate-limit";
import { getSiteInfo } from "@/lib/site-info";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const rateLimited = rejectReadRateLimit(
    request,
    `admin-site-info:${gate.userId}`,
    { limit: 30, windowMs: 60 * 60 * 1000 }
  );
  if (rateLimited) return rateLimited;

  return NextResponse.json(getSiteInfo());
}
