import { normalizeCardSerialFields } from "@/lib/card-serial";
import { normalizeOpeningDate } from "@/lib/opening-date";
import { REFERENCE_YEAR_REGEX } from "@/lib/reference-mutations";
import type { Card } from "@/lib/types";

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  return trimmed ? trimmed : null;
}

export function joinGrading(company: string, note: string): string {
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
    variation: asTrimmedString(raw.variation),
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
    photo: asNullableString(raw.photo),
    tradable: Boolean(raw.tradable),
    rookie: Boolean(raw.rookie),
  };

  const id = asTrimmedString(raw.id);
  if (id) {
    prepared.id = id;
  }

  return prepared;
}

export function buildCardWritePayload(
  form: Partial<Card>,
  gradingNote: string
): Record<string, unknown> {
  const variation = asTrimmedString(form.variation);
  const isRookie =
    variation.toUpperCase().startsWith("RC ") ||
    variation.toUpperCase() === "RC";

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
      photo: asNullableString(form.photo),
      tradable: Boolean(form.tradable),
      rookie: isRookie,
    })
  );
}

export function validateCardWritePayload(payload: Record<string, unknown>): string | null {
  if (!asTrimmedString(payload.player)) {
    return "errors.playerRequired";
  }
  const year = asNullableString(payload.year);
  if (year && !REFERENCE_YEAR_REGEX.test(year)) {
    return "errors.yearInvalid";
  }
  const openingDate = asNullableString(payload.openingDate);
  if (openingDate && !normalizeOpeningDate(openingDate)) {
    return "errors.openingDateInvalid";
  }
  return null;
}
