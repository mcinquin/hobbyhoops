import { afterEach, describe, expect, it, vi } from "vitest";
import {
  auditCardFields,
  auditLog,
  auditReferencePatch,
  auditShipmentUpdateFields,
} from "@/lib/audit-log";

describe("auditLog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("formats card fields and quotes values with spaces", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    auditLog("card.create", {
      user: "admin",
      ...auditCardFields({
        id: "HH-0001",
        player: "Victor Wembanyama",
        year: "2023",
        brand: "Prizm",
        set: "Instant Impact",
        variation: "Base",
      }),
    });

    expect(info).toHaveBeenCalledOnce();
    const line = String(info.mock.calls[0]?.[0]);
    expect(line).toContain("[hobbyhoops:audit] card.create");
    expect(line).toContain('player="Victor Wembanyama"');
    expect(line).toContain('set="Instant Impact"');
  });

  it("logs batch reference actions with count only", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    auditReferencePatch("admin", {
      action: "addBrands",
      brands: ["Prizm", "Select", "Prizm"],
    });

    expect(info).toHaveBeenCalledOnce();
    expect(String(info.mock.calls[0]?.[0])).toContain("ref.brand.add");
    expect(String(info.mock.calls[0]?.[0])).toContain("count=2");
    expect(String(info.mock.calls[0]?.[0])).not.toContain("Prizm");
  });

  it("extracts shipment patch fields for audit", () => {
    expect(
      auditShipmentUpdateFields({
        status: "received",
        cardId: "HH-0002",
        notes: "hidden",
      })
    ).toEqual({
      status: "received",
      cardId: "HH-0002",
    });
  });
});
