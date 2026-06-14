import { NextRequest, NextResponse } from "next/server";
import {
  createFrNbaPlayer,
  editFrNbaPlayer,
  getFrNbaPlayers,
} from "@/lib/data";
import { requireAuth } from "@/lib/auth-api";
import { auditLog } from "@/lib/audit-log";
import {
  formatZodError,
  frNbaUpdateSchema,
  frNbaWriteSchema,
} from "@/lib/guide-schema";
import { getRequestTranslator } from "@/i18n/request";
import { parseJsonBody } from "@/lib/parse-json-body";
import { rejectCrossSiteMutation } from "@/lib/request-guard";
import { rejectWriteRateLimit } from "@/lib/api-write-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json(getFrNbaPlayers());
}

export async function POST(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(request, `fr-nba:write:${gate.userId}`, {
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = frNbaWriteSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const player = createFrNbaPlayer(parsed.data);
  auditLog("fr-nba.create", {
    user: gate.username,
    id: player.id,
    player: player.player,
    holdings: player.holdings.length,
    rpa: player.rpa,
  });
  return NextResponse.json(player, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(request, `fr-nba:write:${gate.userId}`, {
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = frNbaUpdateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const { id, ...body } = parsed.data;
  const updated = editFrNbaPlayer(id, body);
  if (!updated) {
    return NextResponse.json(
      { error: t("errors.frNbaNotFound") },
      { status: 404 }
    );
  }

  auditLog("fr-nba.update", {
    user: gate.username,
    id: updated.id,
    player: updated.player,
    holdings: updated.holdings.length,
    rpa: updated.rpa,
  });

  return NextResponse.json(updated);
}
