import { NextResponse } from "next/server";
import { getDataHealth } from "@/lib/data";

export async function GET() {
  const health = getDataHealth();
  return NextResponse.json(
    { status: health.ok ? "healthy" : "degraded" },
    { status: health.ok ? 200 : 503 }
  );
}
