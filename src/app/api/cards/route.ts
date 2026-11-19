import { NextRequest, NextResponse } from "next/server";
import {
  createCardRecord,
  editCardRecord,
  getCollectionPage,
  mutateReferences,
  parseCollectionSearchParams,
  readCard,
  removeCardRecord,
} from "@/lib/data";
import { requireAuth } from "@/lib/auth-api";
import { auditCardFields, auditLog } from "@/lib/audit-log";
import { normalizeCardSerialFields } from "@/lib/card-serial";
import { prepareCardWriteInput } from "@/lib/card-write";
import { formatTodayOpeningDateFr } from "@/lib/opening-date";
import { syncReferencesFromCard } from "@/lib/reference-mutations";
import {
  cardCreateSchema,
  cardIdSchema,
  cardUpdateSchema,
} from "@/lib/card-schema";
import { guardMutation, parseBody } from "@/lib/api-mutation";

export const dynamic = "force-dynamic";

const CARDS_WRITE_LIMIT = { scope: "cards:write", limit: 120 };

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const query = parseCollectionSearchParams(request.nextUrl.searchParams);
  const result = getCollectionPage(query);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const guard = guardMutation(request, CARDS_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const parsed = await parseBody(request, cardCreateSchema, t, {
    prepare: (data) => {
      const prepared = prepareCardWriteInput(data);
      delete prepared.id;
      return prepared;
    },
  });
  if (!parsed.ok) return parsed.response;

  const newCard = normalizeCardSerialFields({
    ...parsed.data,
    openingDate: parsed.data.openingDate ?? formatTodayOpeningDateFr(),
  });

  const created = createCardRecord(newCard);
  await mutateReferences((refs) => {
    syncReferencesFromCard(refs, created);
  });
  auditLog("card.create", {
    user: session.username,
    ...auditCardFields(created),
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const guard = guardMutation(request, CARDS_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const parsed = await parseBody(request, cardUpdateSchema, t, {
    prepare: prepareCardWriteInput,
  });
  if (!parsed.ok) return parsed.response;

  const saved = editCardRecord(normalizeCardSerialFields(parsed.data));
  if (!saved) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }

  await mutateReferences((refs) => {
    syncReferencesFromCard(refs, saved);
  });
  auditLog("card.update", {
    user: session.username,
    ...auditCardFields(saved),
  });
  return NextResponse.json(saved);
}

export async function DELETE(request: NextRequest) {
  const guard = guardMutation(request, CARDS_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const { searchParams } = new URL(request.url);
  const idParsed = cardIdSchema.safeParse(searchParams.get("id") ?? "");

  if (!idParsed.success) {
    return NextResponse.json(
      { error: t("errors.cardIdMissing") },
      { status: 400 }
    );
  }

  const existing = readCard(idParsed.data);
  if (!existing) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }

  const removed = removeCardRecord(idParsed.data);
  if (!removed) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }

  auditLog("card.delete", {
    user: session.username,
    ...auditCardFields(existing),
  });

  return NextResponse.json({ success: true });
}
