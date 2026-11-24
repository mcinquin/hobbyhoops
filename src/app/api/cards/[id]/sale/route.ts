import { NextRequest, NextResponse } from "next/server";
import { auditCardFields, auditLog } from "@/lib/audit-log";
import { guardMutation, parseBody } from "@/lib/api-mutation";
import { cardIdSchema, cardSaleSchema } from "@/lib/card-schema";
import { parseAmountToCents } from "@/lib/money";
import { recordCardSale } from "@/lib/data";

export const dynamic = "force-dynamic";

const SALE_WRITE_LIMIT = { scope: "cards:write", limit: 120 };

type RouteContext = { params: Promise<{ id: string }> };

/** Accepts amounts as cents or as typed text (`12,50`), like the card form. */
function prepareSaleInput(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return data;
  const raw = data as Record<string, unknown>;
  const asCents = (value: unknown) =>
    typeof value === "string" ? parseAmountToCents(value) : value;
  return {
    ...raw,
    salePriceCents: asCents(raw.salePriceCents),
    saleFeesCents: asCents(raw.saleFeesCents),
  };
}

/** Records the sale of a card (and flags it as an investment). */
export async function PUT(request: NextRequest, context: RouteContext) {
  const guard = guardMutation(request, SALE_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const { id } = await context.params;
  const cardId = cardIdSchema.safeParse(id);
  if (!cardId.success) {
    return NextResponse.json({ error: t("errors.cardIdMissing") }, { status: 400 });
  }

  const parsed = await parseBody(request, cardSaleSchema, t, { prepare: prepareSaleInput });
  if (!parsed.ok) return parsed.response;

  const { soldAt, salePriceCents, saleFeesCents } = parsed.data;
  if (soldAt === null || salePriceCents === null) {
    return NextResponse.json({ error: t("errors.saleIncomplete") }, { status: 400 });
  }

  const saved = recordCardSale(cardId.data, { soldAt, salePriceCents, saleFeesCents });
  if (!saved) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }

  auditLog("card.sale.record", {
    user: session.username,
    ...auditCardFields(saved),
    soldAt,
    salePriceCents,
  });
  return NextResponse.json(saved);
}

/** Cancels the sale of a card: it is held again. */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const guard = guardMutation(request, SALE_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const { id } = await context.params;
  const cardId = cardIdSchema.safeParse(id);
  if (!cardId.success) {
    return NextResponse.json({ error: t("errors.cardIdMissing") }, { status: 400 });
  }

  const saved = recordCardSale(cardId.data, null);
  if (!saved) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }

  auditLog("card.sale.cancel", { user: session.username, ...auditCardFields(saved) });
  return NextResponse.json(saved);
}
