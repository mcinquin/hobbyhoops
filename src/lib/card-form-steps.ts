import type { z } from "zod";
import { cardCreateFieldsSchema, hasConsistentSale } from "@/lib/card-schema";
import { buildCardWritePayload, validateCardSerialInput } from "@/lib/card-write";
import type { Card } from "@/lib/types";

/** Steps of the add / edit card form, in order. */
export const CARD_FORM_STEPS = ["photos", "identity", "catalog", "condition"] as const;

export type CardFormStep = (typeof CARD_FORM_STEPS)[number];

/** Card fields written by the form (same keys as the create API payload). */
export type CardFormField = keyof z.input<typeof cardCreateFieldsSchema>;

/** Fields entered on each step; every card field belongs to exactly one step. */
export const CARD_FORM_STEP_FIELDS = {
  photos: ["photoFront", "photoBack"],
  identity: ["player", "team", "year", "rookie", "wnba"],
  catalog: [
    "brand",
    "set",
    "variation",
    "cardNumber",
    "serialNumber",
    "serialCurrent",
    "serialTotal",
    "autograph",
    "memorabilia",
  ],
  condition: [
    "openingDate",
    "grading",
    "protection",
    "storage",
    "purchasePriceCents",
    "purchaseCurrency",
    "purchaseFeesCents",
    "tradable",
    "investment",
    "soldAt",
    "salePriceCents",
    "saleFeesCents",
    "notes",
  ],
} as const satisfies Record<CardFormStep, readonly CardFormField[]>;

/** A validation failure, located on its step and field. */
export type CardStepError = {
  step: CardFormStep;
  field: CardFormField;
  /** i18n key (`errors.*`), or `null` when the rule has no dedicated message. */
  messageKey: string | null;
};

/** Messages for Zod rules that carry no `errors.*` key of their own. */
const FIELD_MESSAGE_KEYS: Partial<Record<CardFormField, string>> = {
  player: "errors.playerRequired",
};

/** Step on which a card field is entered. */
export function stepOfField(field: CardFormField): CardFormStep {
  const step = CARD_FORM_STEPS.find((candidate) =>
    (CARD_FORM_STEP_FIELDS[candidate] as readonly CardFormField[]).includes(field)
  );
  return step ?? "identity";
}

/**
 * Validates only the fields of one step with the API's Zod rules
 * (`cardCreateFieldsSchema`), on the payload the form would send.
 */
export function validateCardFormStep(
  step: CardFormStep,
  form: Partial<Card>,
  gradingNote: string
): CardStepError | null {
  const fields: readonly CardFormField[] = CARD_FORM_STEP_FIELDS[step];

  // Checked on the raw input: the payload builder would silently drop a mangled serial.
  if (fields.includes("serialNumber")) {
    const serialError = validateCardSerialInput(form.serialNumber);
    if (serialError) {
      return { step, field: "serialNumber", messageKey: serialError };
    }
  }

  const payload = buildCardWritePayload(form, gradingNote);
  const mask = Object.fromEntries(fields.map((field) => [field, true])) as {
    [K in CardFormField]?: true;
  };
  const stepPayload = Object.fromEntries(fields.map((field) => [field, payload[field]]));
  const result = cardCreateFieldsSchema.pick(mask).safeParse(stepPayload);
  if (result.success) {
    if (fields.includes("salePriceCents") && !hasConsistentSale(result.data as {
      soldAt: string | null;
      salePriceCents: number | null;
    })) {
      return { step, field: "salePriceCents", messageKey: "errors.saleIncomplete" };
    }
    return null;
  }

  const issue = result.error.issues[0];
  const field = (issue?.path[0] as CardFormField | undefined) ?? fields[0];
  const messageKey = issue?.message.startsWith("errors.")
    ? issue.message
    : (FIELD_MESSAGE_KEYS[field] ?? null);
  return { step, field, messageKey };
}

/** First invalid step of the whole form, in step order (used before saving). */
export function validateCardForm(
  form: Partial<Card>,
  gradingNote: string
): CardStepError | null {
  for (const step of CARD_FORM_STEPS) {
    const error = validateCardFormStep(step, form, gradingNote);
    if (error) return error;
  }
  return null;
}
