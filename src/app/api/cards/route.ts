import { NextRequest, NextResponse } from "next/server";
import { getCollection, saveCollection } from "@/lib/data";
import { requireAuth } from "@/lib/auth-api";
import { normalizeCardSerialFields } from "@/lib/card-serial";
import { prepareCardWriteInput } from "@/lib/card-write";
import { formatTodayOpeningDateFr } from "@/lib/opening-date";
import {
  cardCreateSchema,
  cardUpdateSchema,
  formatZodError,
} from "@/lib/card-schema";
import { getRequestTranslator } from "@/i18n/request";
import { rejectCrossSiteMutation } from "@/lib/request-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const cards = getCollection();
  return NextResponse.json(cards);
}

export async function POST(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("errors.invalidJson") }, { status: 400 });
  }

  const prepared = prepareCardWriteInput(body);
  delete prepared.id;
  const parsed = cardCreateSchema.safeParse(prepared);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const cards = getCollection();
  const newCard = normalizeCardSerialFields({
    ...parsed.data,
    openingDate:
      parsed.data.openingDate ?? formatTodayOpeningDateFr(),
  });

  const maxId = cards.reduce((max, card) => {
    const num = parseInt(card.id.replace("card-", ""), 10);
    return num > max ? num : max;
  }, 0);
  const created = {
    ...newCard,
    id: `card-${String(maxId + 1).padStart(4, "0")}`,
  };

  await saveCollection([...cards, created]);
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("errors.invalidJson") }, { status: 400 });
  }

  const parsed = cardUpdateSchema.safeParse(prepareCardWriteInput(body));
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const cards = getCollection();
  const index = cards.findIndex((card) => card.id === parsed.data.id);
  if (index === -1) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }

  const updated = [...cards];
  updated[index] = normalizeCardSerialFields(parsed.data);
  await saveCollection(updated);
  return NextResponse.json(updated[index]);
}

export async function DELETE(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: t("errors.cardIdMissing") },
      { status: 400 }
    );
  }

  const cards = getCollection();
  const filtered = cards.filter((card) => card.id !== id);

  if (filtered.length === cards.length) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }

  await saveCollection(filtered);
  return NextResponse.json({ success: true });
}
