import { describe, expect, it } from "vitest";
import { buildDuplicateGroups } from "./card-duplicates";
import type { CardListItem } from "./types";

const baseCard = (id: string, overrides: Partial<CardListItem> = {}): CardListItem => ({
  id,
  player: "LeBron James",
  team: "Lakers",
  year: "2023",
  brand: "Panini",
  set: "Prizm",
  variation: "Base",
  autograph: false,
  memorabilia: false,
  serialNumber: null,
  serialCurrent: null,
  serialTotal: null,
  cardNumber: "1",
  grading: "",
  openingDate: null,
  protection: "",
  storage: "",
  tradable: false,
  rookie: false,
  notes: "",
  ...overrides,
});

describe("buildDuplicateGroups", () => {
  it("groups cards sharing the strict duplicate key", () => {
    const cardsById = new Map([
      ["card-0001", baseCard("card-0001")],
      ["card-0002", baseCard("card-0002")],
      ["card-0003", { ...baseCard("card-0003"), player: "Other" }],
    ]);

    const groups = buildDuplicateGroups(
      [
        {
          player: "LeBron James",
          year: "2023",
          brand: "Panini",
          set_name: "Prizm",
          variation: "Base",
          card_number: "1",
          serial_number: "",
          ids: "card-0001,card-0002",
        },
      ],
      cardsById
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.cards).toHaveLength(2);
    expect(groups[0]?.cardNumber).toBe("1");
    expect(groups[0]?.year).toBe("2023");
  });

  it("ignores rows when card numbers differ", () => {
    const cardsById = new Map([
      ["card-0001", baseCard("card-0001")],
      ["card-0002", baseCard("card-0002", { cardNumber: "99" })],
    ]);

    const groups = buildDuplicateGroups([], cardsById);
    expect(groups).toHaveLength(0);
  });
});
