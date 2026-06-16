import { afterEach, describe, expect, it, vi } from "vitest";

const { info } = vi.hoisted(() => ({
  info: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  getLogger: () => ({ info }),
}));

import {
  auditCardFields,
  auditLog,
  auditReferencePatch,
  auditShipmentUpdateFields,
} from "@/lib/audit-log";

describe("auditLog", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs structured card fields", () => {
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
    expect(info).toHaveBeenCalledWith({
      msg: "card.create",
      user: "admin",
      id: "HH-0001",
      player: "Victor Wembanyama",
      year: "2023",
      brand: "Prizm",
      set: "Instant Impact",
      variation: "Base",
    });
  });

  it("logs batch reference actions with count only", () => {
    auditReferencePatch("admin", {
      action: "addBrands",
      brands: ["Prizm", "Select", "Prizm"],
    });

    expect(info).toHaveBeenCalledOnce();
    expect(info).toHaveBeenCalledWith({
      msg: "ref.brand.add",
      user: "admin",
      count: 2,
    });
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
