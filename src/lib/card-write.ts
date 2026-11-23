import {
  isLikelyCorruptedSerialNumber,
  normalizeCardSerialFields,
} from "@/lib/card-serial";
import { DEFAULT_CURRENCY, normalizeCurrency, parseAmountToCents } from "@/lib/money";
import { normalizeOpeningDate } from "@/lib/opening-date";
import { normalizeVariationLabel } from "@/lib/variation-label";
import type { Card } from "@/lib/types";

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  return trimmed ? trimmed : null;
}

function joinGrading(company: string, note: string): string {
  if (company === "Ungraded") {
    return "Ungraded";
  }
  const trimmed = note.trim();
  if (!trimmed) {
    return company;
  }
  if (trimmed.includes(",")) {
    return `${company}, "${trimmed}"`;
  }
  return `${company}, ${trimmed}`;
}

/** Splits a stored grading label back into company and grade. */
export function splitGrading(grading: string | undefined): {
  company: string;
  note: string;
} {
  const value = grading?.trim() || "Ungraded";
  if (value === "Ungraded") {
    return { company: "Ungraded", note: "" };
  }
  const comma = value.indexOf(",");
  if (comma === -1) {
    return { company: value, note: "" };
  }
  const company = value.slice(0, comma).trim();
  let note = value.slice(comma + 1).trim();
  if (note.startsWith('"') && note.endsWith('"')) {
    note = note.slice(1, -1);
  }
  return { company: company || "Ungraded", note };
}

/**
 * Purchase price in cents from untrusted input: numbers are kept as-is (Zod rejects
 * non-integers / NaN), strings are parsed as amounts (`12,50`), anything else is null.
 */
function asPurchasePriceCents(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseAmountToCents(value);
  return null;
}

/** Normalises untrusted card input (trimmed strings, booleans, numbers) before Zod validation. */
export function prepareCardWriteInput(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {};
  }

  const raw = input as Record<string, unknown>;
  const prepared: Record<string, unknown> = {
    player: asTrimmedString(raw.player),
    team: asTrimmedString(raw.team),
    year: asNullableString(raw.year),
    brand: asTrimmedString(raw.brand),
    set: asTrimmedString(raw.set),
    variation: normalizeVariationLabel(asTrimmedString(raw.variation)),
    autograph: Boolean(raw.autograph),
    memorabilia: Boolean(raw.memorabilia),
    serialNumber: asNullableString(raw.serialNumber),
    serialCurrent:
      typeof raw.serialCurrent === "number" && Number.isFinite(raw.serialCurrent)
        ? raw.serialCurrent
        : null,
    serialTotal:
      typeof raw.serialTotal === "number" && Number.isFinite(raw.serialTotal)
        ? raw.serialTotal
        : null,
    cardNumber: asTrimmedString(raw.cardNumber),
    grading: asTrimmedString(raw.grading) || "Ungraded",
    openingDate: normalizeOpeningDate(asNullableString(raw.openingDate)),
    protection: asTrimmedString(raw.protection),
    storage: asTrimmedString(raw.storage),
    photoFront: asNullableString(raw.photoFront),
    photoBack: asNullableString(raw.photoBack),
    tradable: Boolean(raw.tradable),
    rookie: Boolean(raw.rookie),
    wnba: Boolean(raw.wnba),
    notes: asTrimmedString(raw.notes),
    ...preparePurchasePrice(raw.purchasePriceCents, raw.purchaseCurrency),
  };

  const id = asTrimmedString(raw.id);
  if (id) {
    prepared.id = id;
  }

  return prepared;
}

/** Price and currency pair: no currency without a price, EUR by default with one. */
function preparePurchasePrice(
  rawPrice: unknown,
  rawCurrency: unknown
): { purchasePriceCents: number | null; purchaseCurrency: string | null } {
  const purchasePriceCents = asPurchasePriceCents(rawPrice);
  if (purchasePriceCents == null) {
    return { purchasePriceCents: null, purchaseCurrency: null };
  }
  const currency =
    typeof rawCurrency === "string" ? normalizeCurrency(rawCurrency) : null;
  return { purchasePriceCents, purchaseCurrency: currency ?? DEFAULT_CURRENCY };
}

/** Builds the API payload from the card form state. */
export function buildCardWritePayload(
  form: Partial<Card>,
  gradingNote: string
): Record<string, unknown> {
  const variation = asTrimmedString(form.variation);

  return prepareCardWriteInput(
    normalizeCardSerialFields({
      player: asTrimmedString(form.player),
      team: asTrimmedString(form.team),
      year: asNullableString(form.year),
      brand: asTrimmedString(form.brand),
      set: asTrimmedString(form.set),
      variation,
      autograph: Boolean(form.autograph),
      memorabilia: Boolean(form.memorabilia),
      serialNumber: asNullableString(form.serialNumber),
      serialCurrent: form.serialCurrent ?? null,
      serialTotal: form.serialTotal ?? null,
      cardNumber: asTrimmedString(form.cardNumber),
      grading: joinGrading(asTrimmedString(form.grading) || "Ungraded", gradingNote),
      openingDate: normalizeOpeningDate(asNullableString(form.openingDate)),
      protection: asTrimmedString(form.protection),
      storage: asTrimmedString(form.storage),
      photoFront: asNullableString(form.photoFront),
      photoBack: asNullableString(form.photoBack),
      tradable: Boolean(form.tradable),
      rookie: Boolean(form.rookie),
      wnba: Boolean(form.wnba),
      notes: asTrimmedString(form.notes),
      purchasePriceCents: form.purchasePriceCents ?? null,
      purchaseCurrency: asNullableString(form.purchaseCurrency),
    })
  );
}

/**
 * Checks the serial number as typed in the form, before `buildCardWritePayload`
 * normalises it (which would silently drop a value mangled by a spreadsheet,
 * e.g. `12/99` turned into a date serial such as `45658`).
 *
 * @returns an i18n error key, or null when valid.
 */
export function validateCardSerialInput(value: string | null | undefined): string | null {
  const serial = asTrimmedString(value);
  if (serial && isLikelyCorruptedSerialNumber(serial)) {
    return "errors.invalidSerialFormat";
  }
  return null;
}
