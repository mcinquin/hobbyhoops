import type { CardRecognitionSuggestion } from "@/lib/card-recognition/types";
import type { Card } from "@/lib/types";

/** Card form fields a recognition suggestion can prefill, in display order. */
export type RecognitionPrefillField =
  | "player"
  | "year"
  | "brand"
  | "set"
  | "variation"
  | "cardNumber"
  | "serialNumber"
  | "rookie"
  | "autograph"
  | "memorabilia";

const TEXT_FIELDS = [
  "player",
  "year",
  "brand",
  "set",
  "variation",
  "cardNumber",
] as const satisfies readonly RecognitionPrefillField[];

const FLAG_FIELDS = [
  "rookie",
  "autograph",
  "memorabilia",
] as const satisfies readonly RecognitionPrefillField[];

/**
 * Copies a recognition suggestion into the empty fields of a card form; never
 * overwrites what is already filled in.
 *
 * @returns the next form state and the fields that were filled.
 */
export function applyRecognitionSuggestion(
  form: Partial<Card>,
  suggestion: CardRecognitionSuggestion
): { form: Partial<Card>; applied: RecognitionPrefillField[] } {
  const next: Partial<Card> = { ...form };
  const applied: RecognitionPrefillField[] = [];

  for (const field of TEXT_FIELDS) {
    const value = suggestion[field];
    if (!value || (next[field] ?? "").trim()) continue;
    next[field] = value;
    applied.push(field);
  }

  if (suggestion.serialTotal && !(next.serialNumber ?? "").trim()) {
    next.serialNumber = `/${suggestion.serialTotal}`;
    applied.push("serialNumber");
  }

  for (const field of FLAG_FIELDS) {
    if (!suggestion[field] || next[field]) continue;
    next[field] = true;
    applied.push(field);
  }

  return { form: next, applied };
}
