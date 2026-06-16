import { describe, expect, it } from "vitest";
import {
  buildTrackingUrl,
  computeEbayProtection,
  computeVintedProtection,
  detectCarrier,
  formatShipmentDateForInput,
  formatShipmentDateLabel,
  getShipmentProtection,
  isUrgentProtection,
  normalizeShipmentDate,
  parseShipmentDateInput,
} from "./shipment-utils";
import type { Shipment } from "./types";

describe("normalizeShipmentDate", () => {
  it("accepts ISO dates", () => {
    expect(normalizeShipmentDate("2025-06-06")).toBe("2025-06-06");
  });

  it("accepts French dates", () => {
    expect(normalizeShipmentDate("06/06/2025")).toBe("2025-06-06");
  });

  it("rejects invalid dates", () => {
    expect(normalizeShipmentDate("31/02/2025")).toBeNull();
  });
});

describe("formatShipmentDateLabel", () => {
  it("formats dates for French locale", () => {
    expect(formatShipmentDateLabel("2025-06-15", "fr")).toBe("15/06/2025");
  });

  it("formats dates for English locale", () => {
    expect(formatShipmentDateLabel("2025-06-15", "en")).toBe("06/15/2025");
  });
});

describe("parseShipmentDateInput", () => {
  it("parses French slash dates", () => {
    expect(parseShipmentDateInput("15/06/2025", "fr")).toBe("2025-06-15");
  });

  it("parses English slash dates", () => {
    expect(parseShipmentDateInput("06/15/2025", "en")).toBe("2025-06-15");
  });

  it("accepts ISO input in any locale", () => {
    expect(parseShipmentDateInput("2025-06-15", "en")).toBe("2025-06-15");
  });
});

describe("formatShipmentDateForInput", () => {
  it("returns empty string for missing values", () => {
    expect(formatShipmentDateForInput(null, "fr")).toBe("");
  });
});

describe("detectCarrier", () => {
  it("detects UPS tracking numbers", () => {
    expect(detectCarrier("1Z999AA10123456784")).toBe("ups");
  });

  it("detects La Poste international format", () => {
    expect(detectCarrier("6A12345678901")).toBe("laposte");
  });
});

describe("buildTrackingUrl", () => {
  it("builds La Poste URL for French carriers", () => {
    expect(buildTrackingUrl("6A12345678901")).toContain("laposte.fr");
  });

  it("falls back to 17track for unknown carriers", () => {
    expect(buildTrackingUrl("XYZ123")).toContain("17track.net");
  });
});

describe("computeEbayProtection", () => {
  it("returns null without an estimated delivery date", () => {
    expect(computeEbayProtection(null, "shipped")).toBeNull();
  });

  it("marks received shipments as inactive", () => {
    const info = computeEbayProtection("2025-01-01", "received");
    expect(info?.isActive).toBe(false);
  });

  it("computes remaining days from estimated delivery, not purchase date", () => {
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() - 10);
    const iso = expectedDelivery.toISOString().slice(0, 10);
    const info = computeEbayProtection(iso, "shipped");
    expect(info?.isActive).toBe(true);
    expect(info?.daysElapsed).toBe(10);
    expect(info?.daysRemaining).toBe(20);
  });

  it("keeps the full window before estimated delivery", () => {
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + 5);
    const iso = expectedDelivery.toISOString().slice(0, 10);
    const info = computeEbayProtection(iso, "shipped");
    expect(info?.daysElapsed).toBe(0);
    expect(info?.daysRemaining).toBe(30);
    expect(info?.urgency).toBe("safe");
    expect(info?.platform).toBe("ebay");
    expect(info?.phase).toBe("claim_window");
  });
});

describe("computeVintedProtection", () => {
  it("waits until estimated delivery before opening the claim window", () => {
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + 3);
    const iso = expectedDelivery.toISOString().slice(0, 10);
    const info = computeVintedProtection(iso, "in_transit");
    expect(info?.phase).toBe("awaiting_delivery");
    expect(info?.daysRemaining).toBe(2);
    expect(isUrgentProtection(info!)).toBe(false);
  });

  it("starts the 2-day window from estimated delivery", () => {
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() - 1);
    const iso = expectedDelivery.toISOString().slice(0, 10);
    const info = computeVintedProtection(iso, "in_transit");
    expect(info?.phase).toBe("claim_window");
    expect(info?.daysElapsed).toBe(1);
    expect(info?.daysRemaining).toBe(1);
    expect(info?.urgency).toBe("critical");
  });

  it("opens the claim window immediately when marked delivered", () => {
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + 5);
    const iso = expectedDelivery.toISOString().slice(0, 10);
    const info = computeVintedProtection(iso, "delivered");
    expect(info?.phase).toBe("claim_window");
    expect(info?.daysRemaining).toBe(2);
  });
});

describe("getShipmentProtection", () => {
  const base = {
    id: "s-1",
    orderId: "1",
    seller: null,
    description: "Card",
    priceCents: null,
    currency: "EUR",
    orderedAt: "2025-01-01",
    shippedAt: null,
    trackingNumber: "ABC",
    carrier: null,
    expectedDelivery: "2025-06-15",
    status: "in_transit",
    cardId: null,
    notes: "",
  } satisfies Omit<Shipment, "platform">;

  it("supports vinted shipments", () => {
    const protection = getShipmentProtection({ ...base, platform: "vinted" });
    expect(protection?.platform).toBe("vinted");
  });

  it("ignores unsupported platforms", () => {
    expect(getShipmentProtection({ ...base, platform: "comc" })).toBeNull();
  });
});
