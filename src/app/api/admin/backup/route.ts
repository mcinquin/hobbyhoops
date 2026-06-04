import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { rejectReadRateLimit } from "@/lib/api-read-rate-limit";
import { createDatabaseBackupFile } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const rateLimited = rejectReadRateLimit(
    request,
    `admin:backup:${gate.userId}`,
    { limit: 6, windowMs: 60 * 60 * 1000 }
  );
  if (rateLimited) return rateLimited;

  const tmpPath = path.join(os.tmpdir(), `hobbyhoops-backup-${randomUUID()}.db`);

  try {
    await createDatabaseBackupFile(tmpPath);
    const buffer = fs.readFileSync(tmpPath);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="hobbyhoops-${stamp}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "errors.backupFailed" },
      { status: 500 }
    );
  } finally {
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
  }
}
