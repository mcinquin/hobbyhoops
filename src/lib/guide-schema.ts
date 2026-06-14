import { z } from "zod";
import { LABEL_MAX } from "./reference-mutations";
import { FR_NBA_AUTO_STYLES, FR_NBA_HOLDING_TYPES } from "./fr-nba";

const label = z.string().trim().min(1).max(LABEL_MAX);

const nullableBool = z
  .union([z.boolean(), z.null()])
  .optional()
  .transform((value) => value ?? null);

const frNbaHoldingSchema = z
  .object({
    id: z.number().int().positive().optional(),
    type: z.enum(FR_NBA_HOLDING_TYPES),
    autoStyle: z
      .enum(FR_NBA_AUTO_STYLES)
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    rookie: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    const needsAuto =
      value.type === "auto" || value.type === "rpa";
    if (needsAuto && !value.autoStyle) {
      ctx.addIssue({
        code: "custom",
        message: "errors.frNbaAutoStyleRequired",
        path: ["autoStyle"],
      });
    }
    if (!needsAuto && value.autoStyle) {
      ctx.addIssue({
        code: "custom",
        message: "errors.frNbaAutoStyleUnexpected",
        path: ["autoStyle"],
      });
    }
  });

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
    rpa: nullableBool,
    holdings: z.array(frNbaHoldingSchema).default([]),
  })
  .strict();

export const frNbaUpdateSchema = frNbaWriteSchema.extend({
  id: z.number().int().positive(),
});

export { formatZodError } from "./card-schema";
