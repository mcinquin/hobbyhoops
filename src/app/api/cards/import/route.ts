import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { importCardsCsv } from "@/lib/data";
import { CARD_CSV_MAX_ROWS } from "@/lib/card-csv";
import { auditLog } from "@/lib/audit-log";
import { guardMutation, parseBody } from "@/lib/api-mutation";

export const dynamic = "force-dynamic";

const CARDS_IMPORT_LIMIT = { scope: "cards:import", limit: 20 };

const MAX_CSV_BYTES = 5_000_000;

const importSchema = z
  .object({
    csv: z.string().trim().min(1),
    mode: z.enum(["create", "upsert"]),
  })
  .strict();

export async function POST(request: NextRequest) {
  const guard = guardMutation(request, CARDS_IMPORT_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const parsed = await parseBody(request, importSchema, t, {
    maxBytes: MAX_CSV_BYTES,
    errorMessage: t("errors.invalidData"),
  });
  if (!parsed.ok) return parsed.response;

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

  if (hasChanges || result.errors.length === 0) {
    auditLog("card.import", {
      user: session.username,
      mode: parsed.data.mode,
      created: result.created,
      updated: result.updated,
      errors: result.errors.length,
    });
  }

  return NextResponse.json(result, {
    status: hasChanges || result.errors.length === 0 ? 200 : 422,
  });
}
