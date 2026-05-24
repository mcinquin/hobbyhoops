import { z } from "zod";
import { LABEL_MAX, REFERENCE_YEAR_REGEX } from "./reference-mutations";

const label = z.string().trim().min(1).max(LABEL_MAX);
const REFERENCE_BATCH_MAX = 500;

const brandSetEntrySchema = z
  .object({
    brand: label,
    set: label,
  })
  .strict();

const setVariationEntrySchema = z
  .object({
    set: label,
    variation: label,
  })
  .strict();

const year = z
  .string()
  .trim()
  .min(1)
  .max(16)
  .regex(REFERENCE_YEAR_REGEX, "errors.yearInvalid");

const labelsArray = z.array(label).min(1).max(REFERENCE_BATCH_MAX);
const yearsArray = z.array(year).min(1).max(REFERENCE_BATCH_MAX);

export const referencePatchSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("addBrand"),
      brand: label,
    })
    .strict(),
  z
    .object({
      action: z.literal("addBrands"),
      brands: labelsArray,
    })
    .strict(),
  z
    .object({
      action: z.literal("addSet"),
      brand: label,
      set: label,
    })
    .strict(),
  z
    .object({
      action: z.literal("addSets"),
      entries: z.array(brandSetEntrySchema).min(1).max(REFERENCE_BATCH_MAX),
    })
    .strict(),
  z
    .object({
      action: z.literal("addVariation"),
      set: label,
      variation: label,
    })
    .strict(),
  z
    .object({
      action: z.literal("addVariations"),
      entries: z.array(setVariationEntrySchema).min(1).max(REFERENCE_BATCH_MAX),
    })
    .strict(),
  z
    .object({
      action: z.literal("addPlayer"),
      player: label,
    })
    .strict(),
  z
    .object({
      action: z.literal("addPlayers"),
      players: labelsArray,
    })
    .strict(),
  z
    .object({
      action: z.literal("addTeam"),
      team: label,
    })
    .strict(),
  z
    .object({
      action: z.literal("addTeams"),
      teams: labelsArray,
    })
    .strict(),
  z
    .object({
      action: z.literal("addYear"),
      year,
    })
    .strict(),
  z
    .object({
      action: z.literal("addYears"),
      years: yearsArray,
    })
    .strict(),
  z
    .object({
      action: z.literal("removePlayer"),
      player: label,
    })
    .strict(),
  z
    .object({
      action: z.literal("removeTeam"),
      team: label,
    })
    .strict(),
  z
    .object({
      action: z.literal("removeBrand"),
      brand: label,
    })
    .strict(),
  z
    .object({
      action: z.literal("removeSet"),
      brand: label,
      set: label,
    })
    .strict(),
  z
    .object({
      action: z.literal("removeVariation"),
      set: label,
      variation: label,
    })
    .strict(),
]);

export type ReferencePatchBody = z.infer<typeof referencePatchSchema>;

export { formatZodError } from "./card-schema";
