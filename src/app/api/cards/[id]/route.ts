import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { readCard } from "@/lib/data";
import { cardIdSchema } from "@/lib/card-schema";
import { getRequestTranslator } from "@/i18n/request";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const t = getRequestTranslator(request);
  const { id } = await context.params;
  const idParsed = cardIdSchema.safeParse(id);

  if (!idParsed.success) {
    return NextResponse.json(
      { error: t("errors.cardIdMissing") },
      { status: 400 }
    );
  }

  const card = readCard(idParsed.data);
  if (!card) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }

  return NextResponse.json(card);
}
