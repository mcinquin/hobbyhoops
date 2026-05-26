import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/app-version";
import { getDataHealth } from "@/lib/data";

export async function GET() {
  const health = getDataHealth();
  return NextResponse.json(
    {
      ok: health.ok,
      version: APP_VERSION,
      dataDirWritable: health.dataDirWritable,
      dbSizeBytes: health.dbSizeBytes,
    },
    { status: health.ok ? 200 : 503 }
  );
}
