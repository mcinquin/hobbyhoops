import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/types";
import {
  CARD_CSV_HEADER,
  cardsToCsv,
  csvRowToWritePayload,
  parseCardCsv,
} from "@/lib/card-csv";

const sampleCard = (overrides: Partial<Card> = {}): Card => ({
  id: "card-0001",
  player: "LeBron James",
  team: "Lakers",
  year: "2023",
  brand: "Panini",
  set: "Prizm",
  variation: "Silver",
  autograph: false,
  memorabilia: false,
  serialNumber: "10/99",
  serialCurrent: 10,
  serialTotal: 99,
  cardNumber: "1",
  grading: "PSA, 10",
  openingDate: "15/03/2024",
  protection: "Penny sleeve",
  storage: "Box A",
  photoFront: null,
  photoBack: null,
  tradable: true,
  rookie: false,
  wnba: false,
  notes: "From COMC",
  purchasePriceCents: null,
  purchaseCurrency: null,
  investment: false,
  purchaseFeesCents: null,
  soldAt: null,
  salePriceCents: null,
  saleFeesCents: null,
  ...overrides,
});

describe("cardsToCsv", () => {
  it("exports canonical header and boolean values", () => {
    const csv = cardsToCsv([sampleCard()]);
    expect(csv).toContain(CARD_CSV_HEADER);
    expect(csv).toContain("LeBron James");
    expect(csv).toContain("10/99");
    expect(csv).toContain(",true,");
  });
});

describe("parseCardCsv", () => {
  it("parses header aliases and maps booleans", () => {
    const csv = [
      "joueur,club,année,marque,set,variation,auto,memo,rc,échange",
      "Victor Wembanyama,Spurs,2023,Panini,Prizm,Base,oui,non,1,0",
    ].join("\n");

    const rows = parseCardCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.values.player).toBe("Victor Wembanyama");
    expect(rows[0]?.values.year).toBe("2023");

    const payload = csvRowToWritePayload(rows[0]!.values, "create");
    expect(payload.player).toBe("Victor Wembanyama");
    expect(payload.autograph).toBe(true);
    expect(payload.memorabilia).toBe(false);
    expect(payload.rookie).toBe(true);
    expect(payload.tradable).toBe(false);
  });

  it("round-trips exported cards", () => {
    const card = sampleCard({ id: "card-0042", tradable: false, rookie: true });
    const parsed = parseCardCsv(cardsToCsv([card]));
    expect(parsed[0]?.values.id).toBe("card-0042");
    expect(parsed[0]?.values.player).toBe("LeBron James");
    expect(parsed[0]?.values.serial_number).toBe("10/99");
  });
});

describe("purchase price columns", () => {
  it("exports the price as a decimal amount with its currency", () => {
    const csv = cardsToCsv([
      sampleCard({ purchasePriceCents: 1250, purchaseCurrency: "USD" }),
      sampleCard({ id: "card-0002" }),
    ]);
    const lines = csv.trim().split("\n");
    expect(lines[1]?.endsWith(",12.50,USD,false,,,,")).toBe(true);
    expect(lines[2]?.endsWith(",From COMC,,,false,,,,")).toBe(true);
  });

  it("round-trips the price through export and import", () => {
    const card = sampleCard({ purchasePriceCents: 8900, purchaseCurrency: "GBP" });
    const [row] = parseCardCsv(cardsToCsv([card]));
    const payload = csvRowToWritePayload(row!.values, "create");
    expect(payload.purchasePriceCents).toBe(8900);
    expect(payload.purchaseCurrency).toBe("GBP");
  });

  it("parses French aliases and comma decimals, defaulting to EUR", () => {
    const [row] = parseCardCsv(["joueur,prix", "Victor Wembanyama,\"12,50\""].join("\n"));
    const payload = csvRowToWritePayload(row!.values, "create");
    expect(payload.purchasePriceCents).toBe(1250);
    expect(payload.purchaseCurrency).toBe("EUR");
  });

  it("leaves price and currency empty without a price", () => {
    const [row] = parseCardCsv(["player,devise", "Test Player,USD"].join("\n"));
    const payload = csvRowToWritePayload(row!.values, "create");
    expect(payload.purchasePriceCents).toBeNull();
    expect(payload.purchaseCurrency).toBeNull();
  });
});

describe("csvRowToWritePayload", () => {
  it("keeps id only in upsert mode", () => {
    const values = { id: "card-0009", player: "Test Player" };
    expect(csvRowToWritePayload(values, "create").id).toBeUndefined();
    expect(csvRowToWritePayload(values, "upsert").id).toBe("card-0009");
  });
});

describe("investment columns", () => {
  it("round-trips the investment flag, fees and sale", () => {
    const card = sampleCard({
      purchasePriceCents: 10000,
      purchaseCurrency: "EUR",
      investment: true,
      purchaseFeesCents: 450,
      soldAt: "2026-10-02",
      salePriceCents: 18000,
      saleFeesCents: 1200,
    });
    const [row] = parseCardCsv(cardsToCsv([card]));
    const payload = csvRowToWritePayload(row!.values, "create");
    expect(payload).toMatchObject({
      investment: true,
      purchaseFeesCents: 450,
      soldAt: "2026-10-02",
      salePriceCents: 18000,
      saleFeesCents: 1200,
    });
  });

  it("parses French aliases and French sale dates", () => {
    const [row] = parseCardCsv(
      ["joueur,investissement,date_vente,prix_vente", 'Test Player,oui,02/10/2026,"180,00"'].join(
        "\n"
      )
    );
    const payload = csvRowToWritePayload(row!.values, "create");
    expect(payload.investment).toBe(true);
    expect(payload.soldAt).toBe("2026-10-02");
    expect(payload.salePriceCents).toBe(18000);
  });

  it("drops the sale of a card that is not an investment", () => {
    const [row] = parseCardCsv(
      ["player,sold_at,sale_price", "Test Player,2026-10-02,180"].join("\n")
    );
    const payload = csvRowToWritePayload(row!.values, "create");
    expect(payload.soldAt).toBeNull();
    expect(payload.salePriceCents).toBeNull();
    expect(payload.purchaseCurrency).toBeNull();
  });
});
