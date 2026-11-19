import { NextRequest, NextResponse } from "next/server";
import { createWantedEntry, getWantedBlocks, readWantedEntry, removeWantedEntry } from "@/lib/data";
import { requireAuth } from "@/lib/auth-api";
import { auditLog } from "@/lib/audit-log";
import { wantedCreateSchema } from "@/lib/guide-schema";
import { guardMutation, parseBody } from "@/lib/api-mutation";

export const dynamic = "force-dynamic";

const WANTED_WRITE_LIMIT = { scope: "wanted:write", limit: 60 };

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json(getWantedBlocks());
}

export async function POST(request: NextRequest) {
  const guard = guardMutation(request, WANTED_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const parsed = await parseBody(request, wantedCreateSchema, t);
  if (!parsed.ok) return parsed.response;

  const entry = createWantedEntry(parsed.data);
  auditLog("wanted.add", {
    user: session.username,
    id: entry.id,
    player: entry.player,
    brand: parsed.data.brand,
    set: parsed.data.set,
  });
  return NextResponse.json(
    { entry, blocks: getWantedBlocks() },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const guard = guardMutation(request, WANTED_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

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
    user: session.username,
    id: existing.id,
    player: existing.player,
    brand: existing.brand,
    set: existing.set,
  });

  return NextResponse.json({ success: true, blocks: getWantedBlocks() });
}
