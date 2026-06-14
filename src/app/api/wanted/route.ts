import { NextRequest, NextResponse } from "next/server";
import { createWantedEntry, getWantedBlocks, readWantedEntry, removeWantedEntry } from "@/lib/data";
import { requireAuth } from "@/lib/auth-api";
import { auditLog } from "@/lib/audit-log";
import { formatZodError, wantedCreateSchema } from "@/lib/guide-schema";
import { getRequestTranslator } from "@/i18n/request";
import { parseJsonBody } from "@/lib/parse-json-body";
import { rejectCrossSiteMutation } from "@/lib/request-guard";
import { rejectWriteRateLimit } from "@/lib/api-write-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json(getWantedBlocks());
}

export async function POST(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(request, `wanted:write:${gate.userId}`, {
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = wantedCreateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const entry = createWantedEntry(parsed.data);
  auditLog("wanted.add", {
    user: gate.username,
    id: entry.id,
    player: entry.player,
    set: parsed.data.set,
  });
  return NextResponse.json(
    { entry, blocks: getWantedBlocks() },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(request, `wanted:write:${gate.userId}`, {
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  const idRaw = new URL(request.url).searchParams.get("id");
  const id = Number.parseInt(idRaw ?? "", 10);

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json(
      { error: t("errors.wantedIdMissing") },
      { status: 400 }
    );
  }

  const existing = readWantedEntry(id);
  if (!existing) {
    return NextResponse.json(
      { error: t("errors.wantedNotFound") },
      { status: 404 }
    );
  }

  if (!removeWantedEntry(id)) {
    return NextResponse.json(
      { error: t("errors.wantedNotFound") },
      { status: 404 }
    );
  }

  auditLog("wanted.delete", {
    user: gate.username,
    id: existing.id,
    player: existing.player,
    set: existing.set,
  });

  return NextResponse.json({ success: true, blocks: getWantedBlocks() });
}
