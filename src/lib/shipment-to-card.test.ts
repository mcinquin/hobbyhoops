import { describe, expect, it } from "vitest";
import { buildCardDraftFromShipment, parseShipmentDescription } from "./shipment-to-card";
import type { Shipment } from "./types";
import { buildShipmentAlertSummary } from "./shipment-utils";

const sampleShipment = (overrides: Partial<Shipment> = {}): Shipment => ({
  id: "shipment-1",
  platform: "ebay",
  orderId: "12-34567-89012",
  seller: "card_king",
  description: "Victor Wembanyama 2023 Prizm Silver",
  priceCents: 8900,
  currency: "EUR",
  orderedAt: "2025-05-01",
  shippedAt: "2025-05-03",
  trackingNumber: "6A12345678901",
  carrier: "laposte",
  expectedDelivery: "2025-05-10",
  status: "in_transit",
  cardId: null,
  notes: "",
  ...overrides,
});

describe("parseShipmentDescription", () => {
  it("extracts player, year and remainder", () => {
    expect(parseShipmentDescription("Victor Wembanyama 2023 Prizm Silver")).toEqual({
      player: "Victor Wembanyama",
      year: "2023",
      remainder: "Prizm Silver",
    });
  });
});

describe("buildCardDraftFromShipment", () => {
  it("prefills card fields from shipment", () => {
    const draft = buildCardDraftFromShipment(
      sampleShipment(),
      "Achat eBay · card_king"
    );
    expect(draft.player).toBe("Victor Wembanyama");
    expect(draft.year).toBe("2023");
    expect(draft.variation).toBe("Prizm Silver");
    expect(draft.openingDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(draft.notes).toBe("Achat eBay · card_king");
  });
});

describe("buildShipmentAlertSummary", () => {
  it("counts urgent ebay shipments", () => {
    const summary = buildShipmentAlertSummary([
      sampleShipment({ orderedAt: "2025-05-01" }),
      sampleShipment({
        id: "shipment-2",
        platform: "comc",
        orderedAt: "2025-05-01",
      }),
    ]);

    expect(summary.activeCount).toBe(2);
    expect(summary.preview).toHaveLength(2);
  });
});
