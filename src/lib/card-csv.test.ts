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
  photo: null,
  tradable: true,
  rookie: false,
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

describe("csvRowToWritePayload", () => {
  it("keeps id only in upsert mode", () => {
    const values = { id: "card-0009", player: "Test Player" };
    expect(csvRowToWritePayload(values, "create").id).toBeUndefined();
    expect(csvRowToWritePayload(values, "upsert").id).toBe("card-0009");
  });
});
