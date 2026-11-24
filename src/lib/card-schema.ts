import { z } from "zod";
import type { Translator } from "@/i18n/translator";
import { isLocalCardPhotoUrl } from "@/lib/card-photo-constants";
import { isLikelyCorruptedSerialNumber } from "./card-serial";
import { normalizeOpeningDate, OPENING_DATE_REGEX } from "./opening-date";
import { REFERENCE_YEAR_REGEX } from "./reference-mutations";
import { CURRENCY_CODE_REGEX, MAX_PRICE_CENTS } from "./money";
import { ISO_DATE_REGEX, parseIsoDate } from "./locale-date";

const optionalLabel = z
  .string()
  .trim()
  .max(160)
  .optional()
  .default("");

const nullableYear = z
  .string()
  .trim()
  .max(16)
  .nullish()
  .transform((value) => {
    if (value == null || value === "") return null;
    return value;
  })
  .refine(
    (value) => value === null || REFERENCE_YEAR_REGEX.test(value),
    "errors.yearInvalid"
  );

const nullableSerialNumber = z
  .string()
  .trim()
  .max(64)
  .nullish()
  .transform((value) => (value == null || value === "" ? null : value))
  .refine(
    (value) => value === null || !isLikelyCorruptedSerialNumber(value),
    "errors.invalidSerialFormat"
  );

function isSafePhotoUrl(value: string): boolean {
  if (isLocalCardPhotoUrl(value)) return true;
  if (/^https:\/\//i.test(value)) return true;
  return /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value);
}

const nullablePhoto = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((value) => (value == null || value === "" ? null : value))
  .refine(
    (value) => value === null || isSafePhotoUrl(value),
    "errors.photoUrlInvalid"
  );

const nullableCount = z
  .number()
  .int()
  .nonnegative()
  .nullish()
  .transform((value) => value ?? null);

const nullableOpeningDate = z
  .string()
  .trim()
  .max(16)
  .nullish()
  .transform((value) => normalizeOpeningDate(value ?? null))
  .refine(
    (value) => value === null || OPENING_DATE_REGEX.test(value),
    "errors.openingDateInvalid"
  );

const nullablePurchasePriceCents = z
  .number({ error: "errors.purchasePriceInvalid" })
  .int("errors.purchasePriceInvalid")
  .min(0, "errors.purchasePriceInvalid")
  .max(MAX_PRICE_CENTS, "errors.purchasePriceInvalid")
  .nullish()
  .transform((value) => value ?? null);

/** Optional amount in cents (fees, sale price), with its own error message. */
function nullableAmountCents(message: string) {
  return z
    .number({ error: message })
    .int(message)
    .min(0, message)
    .max(MAX_PRICE_CENTS, message)
    .nullish()
    .transform((value) => value ?? null);
}

const nullableSaleDate = z
  .string()
  .trim()
  .max(10)
  .nullish()
  .transform((value) => (value == null || value === "" ? null : value))
  .refine(
    (value) => value === null || (ISO_DATE_REGEX.test(value) && parseIsoDate(value) !== null),
    "errors.saleDateInvalid"
  );

const nullablePurchaseCurrency = z
  .string()
  .trim()
  .toUpperCase()
  .max(3, "errors.purchaseCurrencyInvalid")
  .nullish()
  .transform((value) => (value == null || value === "" ? null : value))
  .refine(
    (value) => value === null || CURRENCY_CODE_REGEX.test(value),
    "errors.purchaseCurrencyInvalid"
  );

const cardFields = {
  player: z.string().trim().min(1).max(160),
  team: z.string().trim().max(160),
  year: nullableYear,
  brand: z.string().trim().max(160),
  set: z.string().trim().max(160),
  variation: z.string().trim().max(160),
  autograph: z.boolean(),
  memorabilia: z.boolean(),
  serialNumber: nullableSerialNumber,
  serialCurrent: nullableCount,
  serialTotal: nullableCount,
  cardNumber: z.string().trim().max(64),
  grading: z.string().trim().max(64),
  openingDate: nullableOpeningDate,
  protection: optionalLabel,
  storage: optionalLabel,
  photoFront: nullablePhoto,
  photoBack: nullablePhoto,
  tradable: z.boolean(),
  rookie: z.boolean(),
  wnba: z.boolean(),
  notes: z.string().trim().max(2000).optional().default(""),
  purchasePriceCents: nullablePurchasePriceCents,
  purchaseCurrency: nullablePurchaseCurrency,
  investment: z.boolean().optional().default(false),
  purchaseFeesCents: nullableAmountCents("errors.purchaseFeesInvalid"),
  soldAt: nullableSaleDate,
  salePriceCents: nullableAmountCents("errors.salePriceInvalid"),
  saleFeesCents: nullableAmountCents("errors.saleFeesInvalid"),
};

/** A sale needs both its date and its price. */
export function hasConsistentSale(card: {
  soldAt: string | null;
  salePriceCents: number | null;
}): boolean {
  return (card.soldAt === null) === (card.salePriceCents === null);
}

const SALE_INCOMPLETE_ISSUE = {
  message: "errors.saleIncomplete",
  path: ["salePriceCents"],
};

export const cardIdSchema = z.string().trim().min(1).max(64);

/** Card fields without the cross-field rules (used to validate a subset, e.g. one form step). */
export const cardCreateFieldsSchema = z.object(cardFields).strict();

export const cardCreateSchema = cardCreateFieldsSchema.refine(
  hasConsistentSale,
  SALE_INCOMPLETE_ISSUE
);

export const cardUpdateSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    ...cardFields,
  })
  .strict()
  .refine(hasConsistentSale, SALE_INCOMPLETE_ISSUE);

/** Sale recorded from the investments page (`PUT /api/cards/[id]/sale`). */
export const cardSaleSchema = z
  .object({
    soldAt: nullableSaleDate.refine((value) => value !== null, "errors.saleDateInvalid"),
    salePriceCents: nullableAmountCents("errors.salePriceInvalid").refine(
      (value) => value !== null,
      "errors.salePriceInvalid"
    ),
    saleFeesCents: nullableAmountCents("errors.saleFeesInvalid"),
  })
  .strict();

function translateIssueMessage(message: string, t: Translator): string {
  return message.startsWith("errors.") ? t(message) : message;
}

/** Localised `path: message` for the first validation issue. */
export function formatZodError(error: z.ZodError, t: Translator): string {
  const issue = error.issues[0];
  if (!issue) return t("errors.invalidData");
  const path =
    issue.path.length > 0 ? issue.path.join(".") : t("errors.requestBody");
  return `${path}: ${translateIssueMessage(issue.message, t)}`;
}

/** Manual valuation reading (`POST /api/cards/[id]/valuations`). */
export const cardValuationCreateSchema = z
  .object({
    valueCents: z
      .number({ error: "errors.valuationInvalid" })
      .int("errors.valuationInvalid")
      .min(0, "errors.valuationInvalid")
      .max(MAX_PRICE_CENTS, "errors.valuationInvalid"),
    valuedAt: z
      .string()
      .trim()
      .refine(
        (value) => ISO_DATE_REGEX.test(value) && parseIsoDate(value) !== null,
        "errors.valuationDateInvalid"
      ),
    note: z.string().trim().max(200).optional().default(""),
  })
  .strict();

/** Positive integer id of a valuation reading. */
export const cardValuationIdSchema = z.coerce.number().int().positive();

