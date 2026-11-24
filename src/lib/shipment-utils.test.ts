import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildEbayOrderUrl,
  buildShipmentAlertSummary,
  compareShipmentsByUrgency,
  countOverdueShipments,
  getShipmentOverdueDays,
  isOverdueShipment,
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

/** Midi local — évite les décalages UTC autour de minuit dans les tests relatifs. */
const FIXED_NOW = new Date(2026, 5, 17, 12, 0, 0);

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

  it("detects La Poste S10 lettre suivie / Colissimo", () => {
    expect(detectCarrier("RV123456789FR")).toBe("laposte");
  });

  it("detects La Poste S10 with alphanumeric prefix (6A…FR)", () => {
    expect(detectCarrier("6A123456789FR")).toBe("laposte");
  });

  it("detects Mondial Relay 8-digit expedition numbers", () => {
    expect(detectCarrier("12345678")).toBe("mondialrelay");
  });

  it("detects SpeedPAK / Orange Connex S10 from China", () => {
    expect(detectCarrier("LK123456789CN")).toBe("speedpak");
  });

  it("detects SpeedPAK Standard (ES… 28 chars)", () => {
    expect(detectCarrier("ES10024287564060001010001D0N")).toBe("speedpak");
  });

  it("detects SpeedPAK Economy (EE… 28 chars)", () => {
    expect(detectCarrier("EE1000080117450AB01010001N0N")).toBe("speedpak");
  });

  it("detects eBay Standard Delivery (ESUS…), not SpeedPAK", () => {
    expect(detectCarrier("ESUS364299104")).toBe("ebay_standard");
    expect(detectCarrier("ESUS354796430")).toBe("ebay_standard");
  });

  it("detects eBay International Shipping (EEUS…), not SpeedPAK", () => {
    expect(detectCarrier("EEUS035694194FR0")).toBe("ebay_international");
    expect(detectCarrier("EEUS035694194")).toBe("ebay_international");
  });

  it("detects ePost Global (EPG…)", () => {
    expect(detectCarrier("EPG011024036782505")).toBe("epostglobal");
  });

  it("does not treat short ES+country numbers as SpeedPAK", () => {
    expect(detectCarrier("ESCA12345678")).toBe("ebay_standard");
  });
});

describe("buildTrackingUrl", () => {
  it("builds La Poste URL for French carriers", () => {
    expect(buildTrackingUrl("6A12345678901")).toContain("laposte.fr");
  });

  it("builds Mondial Relay URL", () => {
    expect(buildTrackingUrl("12345678")).toContain("mondialrelay.fr");
  });

  it("builds 17TRACK URL with Orange Connex carrier for SpeedPAK", () => {
    expect(buildTrackingUrl("LK123456789CN", null, "fr")).toBe(
      "https://t.17track.net/fr#nums=LK123456789CN&fc=190205"
    );
  });

  it("builds 17TRACK URL for official SpeedPAK ES numbers", () => {
    expect(
      buildTrackingUrl("ES10024287564060001010001D0N", null, "en")
    ).toBe("https://t.17track.net/en#nums=ES10024287564060001010001D0N&fc=190205");
  });

  it("builds ParcelsApp URL for eBay Standard Delivery", () => {
    expect(buildTrackingUrl("ESUS364299104", null, "fr")).toContain(
      "parcelsapp.com/fr/tracking/"
    );
  });

  it("builds Asendia USA URL for eBay International Shipping", () => {
    expect(buildTrackingUrl("EEUS035694194FR0", null, "fr")).toBe(
      "https://a1.asendiausa.com/tracking/?trackingnumber=EEUS035694194FR0"
    );
  });

  it("builds 17TRACK URL for ePost Global", () => {
    expect(buildTrackingUrl("EPG011024036782505", null, "fr")).toBe(
      "https://t.17track.net/fr#nums=EPG011024036782505"
    );
  });

  it("falls back to ParcelsApp for unknown carriers", () => {
    expect(buildTrackingUrl("XYZ123", null, "en")).toContain(
      "parcelsapp.com/en/tracking/"
    );
  });
});

describe("buildEbayOrderUrl", () => {
  it("builds buyer order details URL", () => {
    expect(buildEbayOrderUrl("ebay", "12-34567-89012")).toBe(
      "https://www.ebay.fr/vod/FetchOrderDetails?orderId=12-34567-89012"
    );
  });

  it("falls back to purchase history without order id", () => {
    expect(buildEbayOrderUrl("ebay", null)).toBe(
      "https://www.ebay.fr/mye/myebay/purchase"
    );
  });

  it("returns null for non-ebay platforms", () => {
    expect(buildEbayOrderUrl("vinted", "12-34567-89012")).toBeNull();
  });
});

describe("computeEbayProtection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null without an estimated delivery date", () => {
    expect(computeEbayProtection(null, "shipped")).toBeNull();
  });

  it("marks received shipments as inactive", () => {
    const info = computeEbayProtection("2025-01-01", "received");
    expect(info?.isActive).toBe(false);
  });

  it("computes remaining days from estimated delivery, not purchase date", () => {
    const info = computeEbayProtection("2026-06-07", "shipped");
    expect(info?.isActive).toBe(true);
    expect(info?.daysElapsed).toBe(10);
    expect(info?.daysRemaining).toBe(20);
  });

  it("keeps the full window before estimated delivery", () => {
    const info = computeEbayProtection("2026-06-22", "shipped");
    expect(info?.daysElapsed).toBe(0);
    expect(info?.daysRemaining).toBe(30);
    expect(info?.urgency).toBe("safe");
    expect(info?.platform).toBe("ebay");
    expect(info?.phase).toBe("claim_window");
  });
});

describe("computeVintedProtection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits until estimated delivery before opening the claim window", () => {
    const info = computeVintedProtection("2026-06-20", "in_transit");
    expect(info?.phase).toBe("awaiting_delivery");
    expect(info?.daysRemaining).toBe(2);
    expect(isUrgentProtection(info!)).toBe(false);
  });

  it("starts the 2-day window from estimated delivery", () => {
    const info = computeVintedProtection("2026-06-16", "in_transit");
    expect(info?.phase).toBe("claim_window");
    expect(info?.daysElapsed).toBe(1);
    expect(info?.daysRemaining).toBe(1);
    expect(info?.urgency).toBe("critical");
  });

  it("opens the claim window immediately when marked delivered", () => {
    const info = computeVintedProtection("2026-06-22", "delivered");
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

describe("getShipmentOverdueDays", () => {
  it("counts days past the expected delivery for parcels still on the way", () => {
    expect(
      getShipmentOverdueDays(
        { expectedDelivery: "2026-06-14", status: "in_transit" },
        FIXED_NOW
      )
    ).toBe(3);
  });

  it("is 0 on the expected delivery day and before", () => {
    expect(
      getShipmentOverdueDays(
        { expectedDelivery: "2026-06-17", status: "shipped" },
        FIXED_NOW
      )
    ).toBe(0);
    expect(
      getShipmentOverdueDays(
        { expectedDelivery: "2026-06-20", status: "pending" },
        FIXED_NOW
      )
    ).toBe(0);
  });

  it("ignores delivered, received and disputed shipments", () => {
    for (const status of ["delivered", "received", "dispute"] as const) {
      expect(
        getShipmentOverdueDays({ expectedDelivery: "2026-06-01", status }, FIXED_NOW)
      ).toBe(0);
    }
  });

  it("ignores missing or invalid expected dates", () => {
    expect(
      getShipmentOverdueDays({ expectedDelivery: null, status: "shipped" }, FIXED_NOW)
    ).toBe(0);
    expect(
      getShipmentOverdueDays(
        { expectedDelivery: "not-a-date", status: "shipped" },
        FIXED_NOW
      )
    ).toBe(0);
  });

  it("accepts legacy French dates", () => {
    expect(
      isOverdueShipment(
        { expectedDelivery: "10/06/2026", status: "shipped" },
        FIXED_NOW
      )
    ).toBe(true);
  });
});

describe("countOverdueShipments", () => {
  it("counts only overdue shipments", () => {
    expect(
      countOverdueShipments(
        [
          { expectedDelivery: "2026-06-10", status: "shipped" },
          { expectedDelivery: "2026-06-10", status: "delivered" },
          { expectedDelivery: "2026-06-30", status: "in_transit" },
          { expectedDelivery: "2026-06-16", status: "pending" },
        ],
        FIXED_NOW
      )
    ).toBe(2);
  });
});

describe("overdue shipments in summaries and sorting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const base: Shipment = {
    id: "s",
    platform: "private",
    orderId: null,
    seller: null,
    description: "Card",
    priceCents: null,
    currency: "EUR",
    orderedAt: "2026-06-01",
    shippedAt: null,
    trackingNumber: null,
    carrier: null,
    expectedDelivery: null,
    status: "in_transit",
    cardId: null,
    notes: "",
  };

  it("reports the overdue count in the alert summary", () => {
    const summary = buildShipmentAlertSummary([
      { ...base, id: "late", expectedDelivery: "2026-06-10" },
      { ...base, id: "ok", expectedDelivery: "2026-06-25" },
      { ...base, id: "done", expectedDelivery: "2026-06-10", status: "received" },
    ]);
    expect(summary.overdueCount).toBe(1);
  });

  it("sorts the most overdue shipments first when protections tie", () => {
    const onTime = { ...base, id: "on-time", expectedDelivery: "2026-06-25" };
    const late = { ...base, id: "late", expectedDelivery: "2026-06-15" };
    const veryLate = { ...base, id: "very-late", expectedDelivery: "2026-06-05" };
    const sorted = [onTime, late, veryLate].sort(compareShipmentsByUrgency);
    expect(sorted.map((s) => s.id)).toEqual(["very-late", "late", "on-time"]);
  });
});
