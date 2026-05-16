import { NextResponse } from "next/server";
import { getDataHealth } from "@/lib/data";

export async function GET() {
  const health = getDataHealth();
  return NextResponse.json({ ok: health.ok }, { status: health.ok ? 200 : 503 });
}
