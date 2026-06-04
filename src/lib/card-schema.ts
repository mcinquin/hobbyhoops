import { z } from "zod";
import type { Translator } from "@/i18n/translator";
import { isLikelyCorruptedSerialNumber } from "./card-serial";
import { normalizeOpeningDate, OPENING_DATE_REGEX } from "./opening-date";
import { REFERENCE_YEAR_REGEX } from "./reference-mutations";

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
  photo: nullablePhoto,
  tradable: z.boolean(),
  rookie: z.boolean(),
  notes: z.string().trim().max(2000).optional().default(""),
};

export const cardIdSchema = z.string().trim().min(1).max(64);

export const cardCreateSchema = z
  .object(cardFields)
  .strict();

export const cardUpdateSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    ...cardFields,
  })
  .strict();

function translateIssueMessage(message: string, t: Translator): string {
  return message.startsWith("errors.") ? t(message) : message;
}

export function formatZodError(error: z.ZodError, t: Translator): string {
  const issue = error.issues[0];
  if (!issue) return t("errors.invalidData");
  const path =
    issue.path.length > 0 ? issue.path.join(".") : t("errors.requestBody");
  return `${path}: ${translateIssueMessage(issue.message, t)}`;
}
