import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { rejectRateLimit } from "@/lib/api-rate-limit";
import { getCollectionStats, getReferences } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const rateLimited = rejectRateLimit(
    request,
    `admin-data:${gate.userId}`,
    { limit: 60, windowMs: 60 * 60 * 1000 }
  );
  if (rateLimited) return rateLimited;

  const stats = getCollectionStats();
  return NextResponse.json({
    references: getReferences(),
    totalCount: stats.total,
  });
}
