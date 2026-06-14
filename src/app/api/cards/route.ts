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
  formatZodError,
} from "@/lib/card-schema";
import { getRequestTranslator } from "@/i18n/request";
import { parseJsonBody } from "@/lib/parse-json-body";
import { rejectCrossSiteMutation } from "@/lib/request-guard";
import { rejectWriteRateLimit } from "@/lib/api-write-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;

  const query = parseCollectionSearchParams(request.nextUrl.searchParams);
  const result = getCollectionPage(query);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(request, `cards:write:${gate.userId}`, {
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const prepared = prepareCardWriteInput(parsedBody.data);
  delete prepared.id;
  const parsed = cardCreateSchema.safeParse(prepared);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const newCard = normalizeCardSerialFields({
    ...parsed.data,
    openingDate: parsed.data.openingDate ?? formatTodayOpeningDateFr(),
  });

  const created = createCardRecord(newCard);
  await mutateReferences((refs) => {
    syncReferencesFromCard(refs, created);
  });
  auditLog("card.create", {
    user: gate.username,
    ...auditCardFields(created),
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(request, `cards:write:${gate.userId}`, {
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = cardUpdateSchema.safeParse(
    prepareCardWriteInput(parsedBody.data)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const saved = editCardRecord(normalizeCardSerialFields(parsed.data));
  if (!saved) {
    return NextResponse.json({ error: t("errors.cardNotFound") }, { status: 404 });
  }

  await mutateReferences((refs) => {
    syncReferencesFromCard(refs, saved);
  });
  auditLog("card.update", {
    user: gate.username,
    ...auditCardFields(saved),
  });
  return NextResponse.json(saved);
}

export async function DELETE(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(request, `cards:write:${gate.userId}`, {
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

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
    user: gate.username,
    ...auditCardFields(existing),
  });

  return NextResponse.json({ success: true });
}
