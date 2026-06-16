import { describe, expect, it } from "vitest";
import { shipmentCreateSchema, shipmentUpdateSchema } from "./shipment-schema";

describe("shipmentCreateSchema", () => {
  const valid = {
    description: "Victor Wembanyama 2023 Prizm",
    orderedAt: "2025-06-01",
    expectedDelivery: "2025-06-15",
    orderId: "12-34567-89012",
    trackingNumber: "6A12345678901",
  };

  it("requires estimated delivery", () => {
    const parsed = shipmentCreateSchema.safeParse({
      ...valid,
      expectedDelivery: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires order id and tracking number", () => {
    expect(
      shipmentCreateSchema.safeParse({ ...valid, orderId: "" }).success
    ).toBe(false);
    expect(
      shipmentCreateSchema.safeParse({ ...valid, trackingNumber: "" }).success
    ).toBe(false);
  });

  it("allows missing seller and price", () => {
    const parsed = shipmentCreateSchema.safeParse({
      ...valid,
      seller: null,
      priceCents: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a valid payload", () => {
    const parsed = shipmentCreateSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.expectedDelivery).toBe("2025-06-15");
      expect(parsed.data.orderId).toBe("12-34567-89012");
      expect(parsed.data.trackingNumber).toBe("6A12345678901");
    }
  });
});

describe("shipmentUpdateSchema", () => {
  it("rejects clearing estimated delivery", () => {
    const parsed = shipmentUpdateSchema.safeParse({
      id: "shipment-1",
      expectedDelivery: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects clearing order id or tracking when patching", () => {
    expect(
      shipmentUpdateSchema.safeParse({ id: "shipment-1", orderId: "" }).success
    ).toBe(false);
    expect(
      shipmentUpdateSchema.safeParse({
        id: "shipment-1",
        trackingNumber: "",
      }).success
    ).toBe(false);
  });
});
