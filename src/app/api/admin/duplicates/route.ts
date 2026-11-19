import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { rejectRateLimit } from "@/lib/api-rate-limit";
import { getDuplicateCardGroups } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const rateLimited = rejectRateLimit(
    request,
    `admin:duplicates:${gate.userId}`,
    { limit: 60, windowMs: 15 * 60 * 1000 }
  );
  if (rateLimited) return rateLimited;

  return NextResponse.json({ groups: getDuplicateCardGroups() });
}
