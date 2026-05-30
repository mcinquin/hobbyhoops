import { NextRequest, NextResponse } from "next/server";
import {
  exportCardsCsv,
  parseCollectionSearchParams,
} from "@/lib/data";
import { requireAuth } from "@/lib/auth-api";
import { rejectReadRateLimit } from "@/lib/api-read-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const rateLimited = rejectReadRateLimit(
    request,
    `cards:export:${gate.userId}`,
    { limit: 30, windowMs: 15 * 60 * 1000 }
  );
  if (rateLimited) return rateLimited;

  const scope = request.nextUrl.searchParams.get("scope") === "all" ? "all" : "filtered";
  const query = parseCollectionSearchParams(request.nextUrl.searchParams);
  const csv = exportCardsCsv(query, scope);
  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = scope === "all" ? "all" : "filtered";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hobbyhoops-cards-${suffix}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
