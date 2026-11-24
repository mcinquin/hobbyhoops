import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { auditLog } from "@/lib/audit-log";
import { guardMutation, parseBody } from "@/lib/api-mutation";
import {
  cardIdSchema,
  cardValuationCreateSchema,
  cardValuationIdSchema,
} from "@/lib/card-schema";
import {
  addCardValuation,
  getCardValuations,
  readCard,
  removeCardValuation,
} from "@/lib/data";
import { getRequestTranslator } from "@/i18n/request";

export const dynamic = "force-dynamic";

const VALUATIONS_WRITE_LIMIT = { scope: "cards:valuations", limit: 120 };

type RouteContext = { params: Promise<{ id: string }> };

/** Card id from the route, or null when malformed. */
async function parseCardId(context: RouteContext): Promise<string | null> {
  const { id } = await context.params;
  const parsed = cardIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

/** Readings of a card, latest first. */
export async function GET(request: NextRequest, context: RouteContext) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const t = getRequestTranslator(request);

  const cardId = await parseCardId(context);
  if (!cardId) {
    return NextResponse.json({ error: t("errors.cardIdMissing") }, { status: 400 });
  }
  if (!readCard(cardId)) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }
  return NextResponse.json({ valuations: getCardValuations(cardId) });
}

/** Adds a manual reading, in the card's currency. */
export async function POST(request: NextRequest, context: RouteContext) {
  const guard = guardMutation(request, VALUATIONS_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const cardId = await parseCardId(context);
  if (!cardId) {
    return NextResponse.json({ error: t("errors.cardIdMissing") }, { status: 400 });
  }

  const parsed = await parseBody(request, cardValuationCreateSchema, t);
  if (!parsed.ok) return parsed.response;

  const valuation = addCardValuation(cardId, parsed.data);
  if (!valuation) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }

  auditLog("card.valuation.add", {
    user: session.username,
    id: cardId,
    valueCents: valuation.valueCents,
    currency: valuation.currency,
    valuedAt: valuation.valuedAt,
  });
  return NextResponse.json({ valuation }, { status: 201 });
}

/** Removes a reading (`?valuationId=`). */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const guard = guardMutation(request, VALUATIONS_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const cardId = await parseCardId(context);
  const valuationId = cardValuationIdSchema.safeParse(
    request.nextUrl.searchParams.get("valuationId") ?? ""
  );
  if (!cardId || !valuationId.success) {
    return NextResponse.json({ error: t("errors.invalidData") }, { status: 400 });
  }

  if (!removeCardValuation(cardId, valuationId.data)) {
    return NextResponse.json({ error: t("errors.valuationNotFound") }, { status: 404 });
  }

  auditLog("card.valuation.delete", {
    user: session.username,
    id: cardId,
    valuationId: valuationId.data,
  });
  return NextResponse.json({ success: true });
}
