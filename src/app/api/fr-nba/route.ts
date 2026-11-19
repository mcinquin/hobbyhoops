import { NextRequest, NextResponse } from "next/server";
import {
  createFrNbaPlayer,
  editFrNbaPlayer,
  getFrNbaPlayers,
} from "@/lib/data";
import { requireAuth } from "@/lib/auth-api";
import { auditLog } from "@/lib/audit-log";
import {
  frNbaUpdateSchema,
  frNbaWriteSchema,
} from "@/lib/guide-schema";
import { guardMutation, parseBody } from "@/lib/api-mutation";

export const dynamic = "force-dynamic";

const FR_NBA_WRITE_LIMIT = { scope: "fr-nba:write", limit: 60 };

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json(getFrNbaPlayers());
}

export async function POST(request: NextRequest) {
  const guard = guardMutation(request, FR_NBA_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const parsed = await parseBody(request, frNbaWriteSchema, t);
  if (!parsed.ok) return parsed.response;

  const player = createFrNbaPlayer(parsed.data);
  auditLog("fr-nba.create", {
    user: session.username,
    id: player.id,
    player: player.player,
    holdings: player.holdings.length,
    rpa: player.rpa,
  });
  return NextResponse.json(player, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const guard = guardMutation(request, FR_NBA_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const parsed = await parseBody(request, frNbaUpdateSchema, t);
  if (!parsed.ok) return parsed.response;

  const { id, ...body } = parsed.data;
  const updated = editFrNbaPlayer(id, body);
  if (!updated) {
    return NextResponse.json(
      { error: t("errors.frNbaNotFound") },
      { status: 404 }
    );
  }

  auditLog("fr-nba.update", {
    user: session.username,
    id: updated.id,
    player: updated.player,
    holdings: updated.holdings.length,
    rpa: updated.rpa,
  });

  return NextResponse.json(updated);
}
