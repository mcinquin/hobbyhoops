import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { importCardsCsv } from "@/lib/data";
import { CARD_CSV_MAX_ROWS } from "@/lib/card-csv";
import { requireAuth } from "@/lib/auth-api";
import { getRequestTranslator } from "@/i18n/request";
import { parseJsonBody } from "@/lib/parse-json-body";
import { rejectCrossSiteMutation } from "@/lib/request-guard";
import { rejectWriteRateLimit } from "@/lib/api-write-rate-limit";

export const dynamic = "force-dynamic";

const MAX_CSV_BYTES = 5_000_000;

const importSchema = z
  .object({
    csv: z.string().trim().min(1),
    mode: z.enum(["create", "upsert"]),
  })
  .strict();

export async function POST(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const crossSite = rejectCrossSiteMutation(request, {
    requireFetchMetadata: true,
  });
  if (crossSite) return crossSite;
  const t = getRequestTranslator(request);

  const rateLimited = rejectWriteRateLimit(
    request,
    `cards:import:${gate.userId}`,
    { limit: 20, windowMs: 15 * 60 * 1000 }
  );
  if (rateLimited) return rateLimited;

  const parsedBody = await parseJsonBody(request, MAX_CSV_BYTES);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = importSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: t("errors.invalidData") }, { status: 400 });
  }

  if (parsed.data.csv.length > MAX_CSV_BYTES) {
    return NextResponse.json(
      { error: t("errors.requestTooLarge") },
      { status: 413 }
    );
  }

  const rowEstimate = parsed.data.csv.split(/\r?\n/).filter((line) => line.trim()).length;
  if (rowEstimate > CARD_CSV_MAX_ROWS + 1) {
    return NextResponse.json(
      { error: t("errors.csvTooManyRows", { max: CARD_CSV_MAX_ROWS }) },
      { status: 400 }
    );
  }

  const result = importCardsCsv(parsed.data.csv, parsed.data.mode, t);
  const hasChanges = result.created > 0 || result.updated > 0;

  return NextResponse.json(result, {
    status: hasChanges || result.errors.length === 0 ? 200 : 422,
  });
}
