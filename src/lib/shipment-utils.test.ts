import { describe, expect, it } from "vitest";
import {
  buildTrackingUrl,
  computeEbayProtection,
  detectCarrier,
  normalizeShipmentDate,
} from "./shipment-utils";

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
  it("marks received shipments as inactive", () => {
    const info = computeEbayProtection("2025-01-01", "received");
    expect(info?.isActive).toBe(false);
  });

  it("computes remaining days for active shipments", () => {
    const orderedAt = new Date();
    orderedAt.setDate(orderedAt.getDate() - 10);
    const iso = orderedAt.toISOString().slice(0, 10);
    const info = computeEbayProtection(iso, "shipped");
    expect(info?.isActive).toBe(true);
    expect(info?.daysElapsed).toBe(10);
    expect(info?.daysRemaining).toBe(20);
  });
});
