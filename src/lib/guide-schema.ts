import { z } from "zod";
import { LABEL_MAX } from "./reference-mutations";

const label = z.string().trim().min(1).max(LABEL_MAX);

const frNbaAutoSchema = z
  .string()
  .trim()
  .max(LABEL_MAX)
  .nullable()
  .optional()
  .transform((value) => {
    if (value == null || value === "") return null;
    const lower = value.toLowerCase();
    if (lower === "on card") return "On card";
    if (lower === "sticker") return "Sticker";
    return value;
  });

const nullableBool = z
  .union([z.boolean(), z.null()])
  .optional()
  .transform((value) => value ?? null);

export const wantedCreateSchema = z
  .object({
    set: label,
    variation: label,
    player: label,
    slot: z
      .union([z.number().int().positive(), z.null()])
      .optional()
      .transform((value) => value ?? null),
  })
  .strict();

export const frNbaWriteSchema = z
  .object({
    player: label,
    draftYear: z.string().trim().max(LABEL_MAX).default(""),
    draftedBy: z.string().trim().max(LABEL_MAX).default(""),
    rookieCard: nullableBool,
    auto: frNbaAutoSchema,
    patch: nullableBool,
    immaculate: nullableBool,
  })
  .strict();

export const frNbaUpdateSchema = frNbaWriteSchema.extend({
  id: z.number().int().positive(),
});

export { formatZodError } from "./card-schema";
