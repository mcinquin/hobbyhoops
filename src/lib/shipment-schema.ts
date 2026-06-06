import { z } from "zod";
import {
  normalizeShipmentDate,
  SHIPMENT_PLATFORMS,
  SHIPMENT_STATUSES,
} from "./shipment-utils";

const label = z.string().trim().min(1).max(200);
const optionalLabel = z.string().trim().max(200).optional().default("");
const nullableLabel = z
  .string()
  .trim()
  .max(200)
  .nullish()
  .transform((value) => (value == null || value === "" ? null : value));

const shipmentDate = z
  .string()
  .trim()
  .min(1)
  .transform((value, ctx) => {
    const normalized = normalizeShipmentDate(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "errors.shipmentDateInvalid" });
      return z.NEVER;
    }
    return normalized;
  });

const optionalShipmentDate = z
  .string()
  .trim()
  .nullish()
  .transform((value, ctx) => {
    if (value == null || value === "") return null;
    const normalized = normalizeShipmentDate(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "errors.shipmentDateInvalid" });
      return z.NEVER;
    }
    return normalized;
  });

const priceCents = z
  .union([z.number().int().nonnegative(), z.null()])
  .optional()
  .transform((value) => value ?? null);

export const shipmentCreateSchema = z
  .object({
    platform: z.enum(SHIPMENT_PLATFORMS).default("ebay"),
    orderId: nullableLabel,
    seller: nullableLabel,
    description: label,
    priceCents,
    currency: z.string().trim().max(8).optional().default("EUR"),
    orderedAt: shipmentDate,
    trackingNumber: nullableLabel,
    carrier: nullableLabel,
    expectedDelivery: optionalShipmentDate,
    notes: optionalLabel,
  })
  .strict();

export const shipmentUpdateSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    platform: z.enum(SHIPMENT_PLATFORMS).optional(),
    orderId: nullableLabel.optional(),
    seller: nullableLabel.optional(),
    description: label.optional(),
    priceCents: priceCents.optional(),
    currency: z.string().trim().max(8).optional(),
    orderedAt: shipmentDate.optional(),
    shippedAt: optionalShipmentDate.optional(),
    trackingNumber: nullableLabel.optional(),
    carrier: nullableLabel.optional(),
    expectedDelivery: optionalShipmentDate.optional(),
    status: z.enum(SHIPMENT_STATUSES).optional(),
    cardId: nullableLabel.optional(),
    notes: optionalLabel.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.platform !== undefined ||
      value.orderId !== undefined ||
      value.seller !== undefined ||
      value.description !== undefined ||
      value.priceCents !== undefined ||
      value.currency !== undefined ||
      value.orderedAt !== undefined ||
      value.shippedAt !== undefined ||
      value.trackingNumber !== undefined ||
      value.carrier !== undefined ||
      value.expectedDelivery !== undefined ||
      value.status !== undefined ||
      value.cardId !== undefined ||
      value.notes !== undefined,
    { message: "errors.invalidRequest" }
  );

export { formatZodError } from "./card-schema";
